import { create } from 'zustand';
import axiosInstance from '../lib/axios';

const usePSBTStore = create((set, get) => ({
  // PSBT States
  sellerPSBT: null,
  buyerPSBT: null,
  signedSellerPSBT: null,
  signedBuyerPSBT: null,
  listingInProgress: false,
  purchaseInProgress: false,
  error: null,

  // Generate Seller PSBT for listing
  generateSellerPSBT: async (ordinalData, priceSats, paymentAddress) => {
    try {
      set({ listingInProgress: true, error: null });
      
      const response = await axiosInstance.post('/psbt/generate-seller', {
        inscription_id: ordinalData.inscription_id,
        inscription_output: ordinalData.output,
        price_sats: priceSats,
        seller_address: ordinalData.owner,
        payment_address: paymentAddress
      });

      set({ 
        sellerPSBT: response.data.unsigned_psbt,
        listingInProgress: false 
      });

      return response.data.unsigned_psbt;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to generate seller PSBT',
        listingInProgress: false 
      });
      throw error;
    }
  },

  // Sign Seller PSBT with wallet
  signSellerPSBT: async (psbtBase64, walletType) => {
    try {
      let signedPSBT;
      
      switch (walletType) {
        case 'unisat':
          if (!window.unisat) throw new Error('Unisat wallet not available');
          signedPSBT = await window.unisat.signPsbt(psbtBase64);
          break;
          
        case 'leather':
          { if (!window.btc) throw new Error('Leather wallet not available');
          const leatherResult = await window.btc.request('signPsbt', {
            psbt: psbtBase64,
            network: 'mainnet'
          });
          signedPSBT = leatherResult.result.psbt;
          break; }
          
        case 'okx':
          if (!window.okxwallet) throw new Error('OKX wallet not available');
          // OKX might use different method names
          try {
            signedPSBT = await window.okxwallet.bitcoin.signPsbt(psbtBase64);
          } catch (e) {
            signedPSBT = await window.okxwallet.request({
              method: 'btc_signPsbt',
              params: [psbtBase64]
            });
          }
          break;
          
        case 'magicEden':
          // Magic Eden uses Sats Connect
          { const { signPsbt } = await import('sats-connect');
          const provider = window.magicEden?.bitcoin;
          if (!provider) throw new Error('Magic Eden wallet not available');
          
          const signResponse = await signPsbt({
            getProvider: () => provider,
            payload: {
              network: {
                type: 'mainnet'
              },
              psbtBase64,
              broadcast: false,
              message: 'Sign PSBT to list your ordinal'
            }
          });
          
          if (signResponse.status === 'success') {
            signedPSBT = signResponse.result.psbtBase64;
          } else {
            throw new Error('User cancelled signing');
          }
          break; }
          
        default:
          throw new Error('Unsupported wallet type');
      }

      set({ signedSellerPSBT: signedPSBT });
      return signedPSBT;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Create Listing with signed PSBT
  createListing: async (listingData) => {
    try {
      set({ listingInProgress: true, error: null });
      
      const response = await axiosInstance.post('/listings', listingData);
      
      set({ 
        listingInProgress: false,
        sellerPSBT: null,
        signedSellerPSBT: null 
      });

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to create listing',
        listingInProgress: false 
      });
      throw error;
    }
  },

  // Generate Buyer PSBT for purchase
  generateBuyerPSBT: async (listingId, buyerAddress, receiverAddress) => {
    try {
      set({ purchaseInProgress: true, error: null });
      
      const response = await axiosInstance.post('/psbt/generate-buyer', {
        listing_id: listingId,
        buyer_address: buyerAddress,
        receiver_address: receiverAddress || buyerAddress
      });

      set({ 
        buyerPSBT: response.data.unsigned_psbt,
        purchaseInProgress: false 
      });

      return response.data.unsigned_psbt;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to generate buyer PSBT',
        purchaseInProgress: false 
      });
      throw error;
    }
  },

  // Sign Buyer PSBT with wallet
  signBuyerPSBT: async (psbtBase64, walletType) => {
    try {
      let signedPSBT;
      
      switch (walletType) {
        case 'unisat':
          if (!window.unisat) throw new Error('Unisat wallet not available');
          signedPSBT = await window.unisat.signPsbt(psbtBase64);
          break;
          
        case 'leather':
          { if (!window.btc) throw new Error('Leather wallet not available');
          const leatherResult = await window.btc.request('signPsbt', {
            psbt: psbtBase64,
            network: 'mainnet'
          });
          signedPSBT = leatherResult.result.psbt;
          break; }
          
        case 'okx':
          if (!window.okxwallet) throw new Error('OKX wallet not available');
          try {
            signedPSBT = await window.okxwallet.bitcoin.signPsbt(psbtBase64);
          } catch (e) {
            signedPSBT = await window.okxwallet.request({
              method: 'btc_signPsbt',
              params: [psbtBase64]
            });
          }
          break;
          
        case 'magicEden':
          { const { signPsbt } = await import('sats-connect');
          const provider = window.magicEden?.bitcoin;
          if (!provider) throw new Error('Magic Eden wallet not available');
          
          const signResponse = await signPsbt({
            getProvider: () => provider,
            payload: {
              network: {
                type: 'mainnet'
              },
              psbtBase64,
              broadcast: false,
              message: 'Sign PSBT to purchase ordinal'
            }
          });
          
          if (signResponse.status === 'success') {
            signedPSBT = signResponse.result.psbtBase64;
          } else {
            throw new Error('User cancelled signing');
          }
          break; }
          
        default:
          throw new Error('Unsupported wallet type');
      }

      set({ signedBuyerPSBT: signedPSBT });
      return signedPSBT;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Complete Purchase
  completePurchase: async (listingId, signedBuyerPSBT) => {
    try {
      set({ purchaseInProgress: true, error: null });
      
      const response = await axiosInstance.post(`/listings/${listingId}/purchase`, {
        signed_buyer_psbt: signedBuyerPSBT
      });
      
      set({ 
        purchaseInProgress: false,
        buyerPSBT: null,
        signedBuyerPSBT: null 
      });

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Purchase failed',
        purchaseInProgress: false 
      });
      throw error;
    }
  },

  // Verify Ownership
  verifyOwnership: async (inscriptionId, address) => {
    try {
      const response = await axiosInstance.post('/psbt/verify-ownership', {
        inscription_id: inscriptionId,
        address: address
      });
      
      return response.data.is_owner;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Ownership verification failed' });
      return false;
    }
  },

  // Clear state
  clearPSBTState: () => set({
    sellerPSBT: null,
    buyerPSBT: null,
    signedSellerPSBT: null,
    signedBuyerPSBT: null,
    error: null
  }),

  clearError: () => set({ error: null })
}));

export default usePSBTStore;
import { create } from 'zustand';
import axiosInstance from '../lib/axios';

const useWalletStore = create((set, get) => ({
  connected: false,
  connecting: false,
  address: null,
  walletType: null,
  publicKey: null,
  network: 'mainnet',
  balance: 0,
  error: null,

  // Connect to Unisat Wallet
  connectUnisat: async () => {
    set({ connecting: true, error: null });
    
    try {
      if (typeof window.unisat === 'undefined') {
        throw new Error("Please install Unisat Wallet extension!");
      }

      const accounts = await window.unisat.requestAccounts();
      const address = accounts[0];
      const publicKey = await window.unisat.getPublicKey();
      const network = await window.unisat.getNetwork();
      const balance = await window.unisat.getBalance();
      
      set({
        connected: true,
        connecting: false,
        address,
        walletType: 'unisat',
        publicKey,
        network,
        balance: balance.total || balance.confirmed || 0,
        error: null
      });

      await get().saveWalletToBackend({
        address,
        wallet_type: 'unisat',
        public_key: publicKey,
        network
      });

      localStorage.setItem('connectedWalletType', 'unisat');
      localStorage.setItem('connectedWalletAddress', address);

      return address;
    } catch (error) {
      set({ 
        error: error.message,
        connecting: false 
      });
      throw error;
    }
  },

  // Connect to Xverse Wallet - FIXED
  connectXverse: async () => {
    set({ connecting: true, error: null });
    
    try {
      // Xverse wallet detection
      const isXverseInstalled = 
        (typeof window.BitcoinProvider !== 'undefined') ||
        (typeof window.btc !== 'undefined') ||
        (typeof window.xverse !== 'undefined');

      if (!isXverseInstalled) {
        throw new Error('Xverse Wallet not installed');
      }

      let address, publicKey;

      // Try different Xverse connection methods
      if (window.btc && typeof window.btc.request === 'function') {
        // Standard btc request method
        const accounts = await window.btc.request('getAddresses', {});
        address = accounts[0]?.address;
        publicKey = await window.btc.request('getPublicKey', {});
      } else if (window.BitcoinProvider && typeof window.BitcoinProvider.request === 'function') {
        // Xverse specific API
        const accounts = await window.BitcoinProvider.request('getAddresses', {});
        address = accounts[0]?.address;
        publicKey = await window.BitcoinProvider.request('getPublicKey', {});
      } else if (window.xverse && typeof window.xverse.request === 'function') {
        // Alternative Xverse API
        const accounts = await window.xverse.request('getAddresses', {});
        address = accounts[0]?.address;
        publicKey = await window.xverse.request('getPublicKey', {});
      } else {
        throw new Error('Xverse Wallet API not available');
      }

      if (!address) {
        throw new Error('Could not get address from Xverse wallet');
      }
      
      set({
        connected: true,
        connecting: false,
        address,
        walletType: 'xverse',
        publicKey,
        network: 'mainnet',
        balance: 0,
        error: null
      });

      await get().saveWalletToBackend({
        address,
        wallet_type: 'xverse',
        public_key: publicKey,
        network: 'mainnet'
      });

      localStorage.setItem('connectedWalletType', 'xverse');
      localStorage.setItem('connectedWalletAddress', address);

      return address;
    } catch (error) {
      set({ 
        error: error.message,
        connecting: false 
      });
      throw error;
    }
  },

  // Connect to Leather Wallet - FIXED
  connectLeather: async () => {
    set({ connecting: true, error: null });
    
    try {
      // Leather wallet detection
      if (typeof window.btc === 'undefined') {
        throw new Error('Leather Wallet not installed');
      }

      let address, publicKey;

      // Leather uses the standard btc provider with request method
      if (typeof window.btc.request === 'function') {
        address = await window.btc.request('getAddress', {});
        publicKey = await window.btc.request('getPublicKey', {});
      } else {
        throw new Error('Leather Wallet API not available');
      }

      if (!address) {
        throw new Error('Could not get address from Leather wallet');
      }
      
      set({
        connected: true,
        connecting: false,
        address,
        walletType: 'leather',
        publicKey,
        network: 'mainnet',
        balance: 0,
        error: null
      });

      await get().saveWalletToBackend({
        address,
        wallet_type: 'leather',
        public_key: publicKey,
        network: 'mainnet'
      });

      localStorage.setItem('connectedWalletType', 'leather');
      localStorage.setItem('connectedWalletAddress', address);

      return address;
    } catch (error) {
      set({ 
        error: error.message,
        connecting: false 
      });
      throw error;
    }
  },

  // Connect to Hiro Wallet - FIXED
  connectHiro: async () => {
    set({ connecting: true, error: null });
    
    try {
      // Hiro wallet detection
      if (typeof window.btc === 'undefined' && typeof window.StacksProvider === 'undefined') {
        throw new Error('Hiro Wallet not installed');
      }

      let address, publicKey;

      // For Bitcoin operations in Hiro
      if (window.btc && typeof window.btc.request === 'function') {
        address = await window.btc.request('getAddress', {});
        publicKey = await window.btc.request('getPublicKey', {});
      } 
      // For Stacks operations (if you want to support Stacks)
      else if (window.StacksProvider && typeof window.StacksProvider.request === 'function') {
        const accounts = await window.StacksProvider.request({ 
          method: 'stx_requestAccounts' 
        });
        address = accounts[0];
        // Note: Stacks addresses are different from Bitcoin addresses
      } else {
        throw new Error('Hiro Wallet API not available');
      }

      if (!address) {
        throw new Error('Could not get address from Hiro wallet');
      }
      
      set({
        connected: true,
        connecting: false,
        address,
        walletType: 'hiro',
        publicKey,
        network: 'mainnet',
        balance: 0,
        error: null
      });

      await get().saveWalletToBackend({
        address,
        wallet_type: 'hiro',
        public_key: publicKey,
        network: 'mainnet'
      });

      localStorage.setItem('connectedWalletType', 'hiro');
      localStorage.setItem('connectedWalletAddress', address);

      return address;
    } catch (error) {
      set({ 
        error: error.message,
        connecting: false 
      });
      throw error;
    }
  },

  // Connect to Magic Eden Wallet - FIXED
  connectMagic: async () => {
    set({ connecting: true, error: null });
    
    try {
      // Magic Eden wallet detection
      if (typeof window.magiceden === 'undefined' && typeof window.btc === 'undefined') {
        throw new Error('Magic Eden Wallet not installed');
      }

      let address, publicKey;

      // Magic Eden specific API
      if (window.magiceden && window.magiceden.bitcoin && typeof window.magiceden.bitcoin.request === 'function') {
        address = await window.magiceden.bitcoin.request('getAddress', {});
        publicKey = await window.magiceden.bitcoin.request('getPublicKey', {});
      } 
      // Fallback to standard btc API
      else if (window.btc && typeof window.btc.request === 'function') {
        address = await window.btc.request('getAddress', {});
        publicKey = await window.btc.request('getPublicKey', {});
      } else {
        throw new Error('Magic Eden Wallet API not available');
      }

      if (!address) {
        throw new Error('Could not get address from Magic Eden wallet');
      }
      
      set({
        connected: true,
        connecting: false,
        address,
        walletType: 'magic',
        publicKey,
        network: 'mainnet',
        balance: 0,
        error: null
      });

      await get().saveWalletToBackend({
        address,
        wallet_type: 'magic',
        public_key: publicKey,
        network: 'mainnet'
      });

      localStorage.setItem('connectedWalletType', 'magic');
      localStorage.setItem('connectedWalletAddress', address);

      return address;
    } catch (error) {
      set({ 
        error: error.message,
        connecting: false 
      });
      throw error;
    }
  },

  // Generic wallet connection
  connectWallet: async (walletType) => {
    switch (walletType) {
      case 'unisat':
        return await get().connectUnisat();
      case 'xverse':
        return await get().connectXverse();
      case 'leather':
        return await get().connectLeather();
      case 'hiro':
        return await get().connectHiro();
      case 'magic':
        return await get().connectMagic();
      default:
        throw new Error('Unsupported wallet type');
    }
  },

  // Save wallet to backend
  saveWalletToBackend: async (walletData) => {
    try {
      const response = await axiosInstance.post('/users/wallet/connect', walletData);
      
      if (response.status >= 200 && response.status < 300) {
        console.log('✅ Wallet saved to backend:', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to save wallet: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error saving wallet:', error);
      return null;
    }
  },

  // Sign message (for verification) - FIXED
  signMessage: async (message) => {
    const { walletType, address } = get();
    
    if (!walletType || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      switch (walletType) {
        case 'unisat':
          return await window.unisat.signMessage(message, 'bip322-simple');
        
        case 'xverse':
        case 'leather':
        case 'hiro':
        case 'magic': {
          // Most wallets use the request method for signing
          if (window.btc && typeof window.btc.request === 'function') {
            return await window.btc.request('signMessage', { message });
          }
          throw new Error('Signing not available for this wallet');
        }
        
        default:
          throw new Error('Signing not supported for this wallet');
      }
    } catch (error) {
      throw new Error(`Signing failed: ${error.message}`);
    }
  },

  // Check if any wallet is available - FIXED
  checkWalletAvailability: () => {
    const wallets = {
      unisat: false,
      xverse: false,
      leather: false,
      hiro: false,
      magic: false
    };
    
    // Check Unisat
    if (typeof window.unisat !== 'undefined' && typeof window.unisat.requestAccounts === 'function') {
      wallets.unisat = true;
    }
    
    // Check Xverse
    if (
      (typeof window.BitcoinProvider !== 'undefined' && typeof window.BitcoinProvider.request === 'function') ||
      (typeof window.btc !== 'undefined' && typeof window.btc.request === 'function') ||
      (typeof window.xverse !== 'undefined' && typeof window.xverse.request === 'function')
    ) {
      wallets.xverse = true;
    }
    
    // Check Leather
    if (typeof window.btc !== 'undefined' && typeof window.btc.request === 'function') {
      wallets.leather = true;
    }
    
    // Check Hiro
    if (
      (typeof window.btc !== 'undefined' && typeof window.btc.request === 'function') ||
      (typeof window.StacksProvider !== 'undefined' && typeof window.StacksProvider.request === 'function')
    ) {
      wallets.hiro = true;
    }
    
    // Check Magic Eden
    if (
      (typeof window.magiceden !== 'undefined' && window.magiceden.bitcoin && typeof window.magiceden.bitcoin.request === 'function') ||
      (typeof window.btc !== 'undefined' && typeof window.btc.request === 'function')
    ) {
      wallets.magic = true;
    }
    
    return wallets;
  },

  // Disconnect wallet
  disconnectWallet: async () => {
    const { address } = get();
    
    try {
      if (address) {
        await axiosInstance.post('/users/wallet/disconnect', { address });
      }
    } catch (error) {
      console.error('Error notifying backend about disconnect:', error);
    }

    // Clear local state
    set({
      connected: false,
      address: null,
      walletType: null,
      publicKey: null,
      balance: 0,
      error: null,
      connecting: false
    });

    // Clear localStorage
    localStorage.removeItem('connectedWalletType');
    localStorage.removeItem('connectedWalletAddress');
  },

  // Get user's wallet info from backend
  getWalletFromBackend: async (address) => {
    try {
      const response = await axiosInstance.get(`/users/wallet/${address}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet from backend:', error);
      return null;
    }
  },

  // Update wallet balance from backend
  updateWalletBalance: async () => {
    const { address } = get();
    if (!address) return;

    try {
      const response = await axiosInstance.get(`/users/wallet/${address}/balance`);
      if (response.data.success) {
        set({ balance: response.data.balance });
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  },

  // Auto-connect if wallet was previously connected
  autoConnect: async () => {
    try {
      const savedWalletType = localStorage.getItem('connectedWalletType');
      const savedAddress = localStorage.getItem('connectedWalletAddress');
      
      if (savedWalletType && savedAddress) {
        if (savedWalletType === 'unisat' && typeof window.unisat !== 'undefined') {
          const accounts = await window.unisat.getAccounts();
          if (accounts && accounts.length > 0 && accounts[0] === savedAddress) {
            return await get().connectUnisat();
          }
        } else if (savedWalletType !== 'unisat') {
          // For other wallets, try to reconnect
          return await get().connectWallet(savedWalletType);
        }
      }
    } catch (error) {
      console.error('Auto-connect failed:', error);
      localStorage.removeItem('connectedWalletType');
      localStorage.removeItem('connectedWalletAddress');
    }
    return null;
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset connection state
  reset: () => set({
    connected: false,
    connecting: false,
    address: null,
    walletType: null,
    publicKey: null,
    balance: 0,
    error: null
  })
}));

export default useWalletStore;
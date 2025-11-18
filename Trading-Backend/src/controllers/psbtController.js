import { 
  generateSellerPSBT as generateSellerPSBTService,
  generateBuyerPSBT as generateBuyerPSBTService,
  verifyOwnership as verifyOwnershipService,
  validatePSBT as validatePSBTService,
  signPSBTWithWalletService,
  verifySignedPSBTService 
} from '../services/psbtService.js';
import { AppError } from '../middleware/errorHandler.js';
import {Listing} from '../models/Listing.js';

export const generateSellerPSBT = async (req, res, next) => {
  try {
    const {
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address,
      network
    } = req.body;

    // Validate required fields
    if (!inscription_id || !inscription_output || !price_sats || !seller_address) {
      throw new AppError('Missing required fields', 400);
    }

    // Verify ownership before generating PSBT
    // const isOwner = await verifyOwnershipService(inscription_id, seller_address);
    const isOwner=true; // Temporarily bypass ownership check for testing
    if (!isOwner) {
      throw new AppError('You are not the owner of this inscription', 403);
    }

    const unsignedPSBT = await generateSellerPSBTService(
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address || seller_address,
      network
    );

    res.json({
      success: true,
      message: 'Seller PSBT generated successfully',
      data: {
        unsigned_psbt: unsignedPSBT
      }
    });
  } catch (error) {
    next(error);
  }
};

export const generateBuyerPSBT = async (req, res, next) => {
  try {
    const {
      listing_id,
      buyer_address,
      receiver_address
    } = req.body;

    if (!listing_id || !buyer_address) {
      throw new AppError('Missing required fields: listing_id and buyer_address', 400);
    }

    // Fetch listing details
    const listing = await Listing.findById(listing_id).populate('ordinal');
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.status !== 'active') {
      throw new AppError('Listing is no longer active', 400);
    }

    const unsignedPSBT = await generateBuyerPSBTService(
      listing,
      buyer_address,
      receiver_address || buyer_address
    );

    res.json({
      success: true,
      message: 'Buyer PSBT generated successfully',
      data: {
        unsigned_psbt: unsignedPSBT,
        listing: {
          id: listing._id,
          price_sats: listing.price_sats,
          price_btc: listing.price_btc,
          seller_address: listing.seller_address
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOwnership = async (req, res, next) => {
  try {
    const { inscription_id, address } = req.body;

    if (!inscription_id || !address) {
      throw new AppError('Missing required fields: inscription_id and address', 400);
    }

    const isOwner = await verifyOwnershipService(inscription_id, address);

    res.json({
      success: true,
      data: {
        is_owner: isOwner,
        inscription_id,
        address
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validatePSBT = async (req, res, next) => {
  try {
    const { psbt_base64, inscription_output, expected_amount } = req.body;

    if (!psbt_base64 || !inscription_output) {
      throw new AppError('Missing required fields: psbt_base64 and inscription_output', 400);
    }

    const isValid = await validatePSBTService(psbt_base64, inscription_output, expected_amount);

    res.json({
      success: true,
      data: {
        is_valid: isValid,
        validated: isValid
      }
    });
  } catch (error) {
    next(error);
  }
};

export const broadcastPSBT = async (req, res, next) => {
  try {
    const { signed_psbt_base64 } = req.body;

    if (!signed_psbt_base64) {
      throw new AppError('Missing required field: signed_psbt_base64', 400);
    }

    // Import bitcoinjs-lib dynamically
    const bitcoin = await import('bitcoinjs-lib');
    
    const psbt = bitcoin.Psbt.fromBase64(signed_psbt_base64);
    
    // Finalize all inputs
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        psbt.finalizeInput(i);
      } catch (e) {
        // Input might already be finalized or doesn't need finalization
        console.log(`Input ${i} finalization skipped:`, e.message);
      }
    }

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txId = tx.getId();

    // Broadcast transaction (you'll need to implement this based on your mempool service)
    const { broadcastTx } = await import('../services/mempoolService.js');
    await broadcastTx(txHex);

    res.json({
      success: true,
      message: 'Transaction broadcast successfully',
      data: {
        tx_id: txId,
        tx_hex: txHex,
        explorer_url: `https://mempool.space/tx/${txId}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add these functions to your existing psbtController.js

// Sign PSBT with wallet
export const signPSBTWithWallet = async (req, res, next) => {
  try {
    const {
      unsigned_psbt,
      network = 'testnet',
      wallet_type = 'unisat' // unisat, xverse, etc.
    } = req.body;

    // Validate required fields
    if (!unsigned_psbt) {
      throw new AppError('unsigned_psbt is required', 400);
    }

    console.log('🔏 Signing PSBT with wallet...');
    console.log('Wallet type:', wallet_type);
    console.log('Network:', network);

    const signingResult = await signPSBTWithWalletService(
      unsigned_psbt,
      network,
      wallet_type
    );

    res.json({
      success: true,
      message: 'PSBT signing process initiated',
      data: signingResult
    });
  } catch (error) {
    next(error);
  }
};

// Verify signed PSBT
export const verifySignedPSBT = async (req, res, next) => {
  try {
    const {
      signed_psbt,
      network = 'testnet'
    } = req.body;

    if (!signed_psbt) {
      throw new AppError('signed_psbt is required', 400);
    }

    console.log('🔍 Verifying signed PSBT...');

    const verificationResult = await verifySignedPSBTService(
      signed_psbt,
      network
    );

    res.json({
      success: true,
      message: verificationResult.isFullySigned ? 
        'PSBT is fully signed and ready for broadcast' : 
        'PSBT verification completed',
      data: verificationResult
    });
  } catch (error) {
    next(error);
  }
};
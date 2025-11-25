import express from 'express';
import {
  generateSellerPSBT,
  generateSellerPSBTSimple,
  createListingWithSignedPSBT,
  generateBuyerPSBT,
  generateDummyUtxo,
  verifyOwnership,
  validatePSBT,
  decodePSBT,
  signPSBTWithWallet,
  verifySignedPSBT,
  broadcastTransaction,combinePSBTController
} from '../controllers/psbtController.js';
import {
  signDummyUtxoPSBT,
  getDummyUtxoTransactionStatus,
} from '../services/psbtService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// ============================================================================
// HEALTH CHECK
// ============================================================================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'PSBT service is running',
    endpoints: {
      seller: [
        'POST /generate-seller - Generate unsigned seller PSBT',
        'POST /create-listing - Create listing with signed PSBT'
      ],
      buyer: [
        'POST /generate-buyer - Generate buyer PSBT for purchase',
        'POST /generate-dummy-utxo - Create dummy UTXO for purchases'
      ],
      utilities: [
        'POST /verify-ownership - Verify inscription ownership',
        'POST /validate - Validate PSBT',
        'POST /decode - Decode PSBT/Transaction',
        'POST /verify-signed-psbt - Verify signed PSBT',
        'POST /broadcast - Broadcast transaction'
      ]
    }
  });
});

// ============================================================================
// SELLER FLOW
// ============================================================================

/**
 * STEP 1: Generate unsigned seller PSBT
 * Body: {
 *   inscription_id: string,
 *   inscription_output: string (txid:vout),
 *   price_sats: number,
 *   seller_address: string,
 *   payment_address?: string,
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/generate-seller', generateSellerPSBT);

/**
 * STEP 1 (Alternative): Generate simple seller PSBT
 * Smaller size, witnessUtxo only
 */
router.post('/generate-seller-simple', generateSellerPSBTSimple);

/**
 * STEP 2: Create listing with signed PSBT
 * Body: {
 *   inscription_id: string,
 *   inscription_number?: string,
 *   inscription_output: string,
 *   price_sats: number,
 *   price_btc?: number,
 *   seller_address: string,
 *   payment_address?: string,
 *   signed_psbt: string (base64 or hex),
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/create-listing', (req, res, next) => {
  // Add the isForListing option
  req.isForListing = true;
  createListingWithSignedPSBT(req, res, next);
});

// ============================================================================
// BUYER FLOW
// ============================================================================

// ============================================================================
// DUMMY UTXO SIGNING & BROADCASTING ROUTES
// ============================================================================

/**
 * Sign dummy UTXO PSBT
 * Body: { unsigned_psbt, network? }
 */
router.post('/sign-dummy-utxo', async (req, res, next) => {
  try {
    const { unsigned_psbt, network = 'testnet' } = req.body;

    if (!unsigned_psbt) {
      throw new AppError('unsigned_psbt is required', 400);
    }

    const result = await signDummyUtxoPSBT(unsigned_psbt, network);

    res.json({
      success: true,
      message: 'Dummy UTXO PSBT signed successfully',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get dummy UTXO transaction status
 * Body: { txid, network? }
 */
router.post('/dummy-utxo-status', async (req, res, next) => {
  try {
    const { txid, network = 'testnet' } = req.body;

    if (!txid) {
      throw new AppError('txid is required', 400);
    }

    const result = await getDummyUtxoTransactionStatus(txid, network);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * STEP 1 (Optional): Generate dummy UTXO
 * Required before first purchase
 * Body: {
 *   payer_address: string,
 *   number_of_dummy_utxos?: number (default 1, max 10),
 *   network?: 'testnet' | 'mainnet',
 *   fee_level?: 'fastestFee' | 'halfHourFee' | 'hourFee' | 'economyFee'
 * }
 */
router.post('/generate-dummy-utxo', generateDummyUtxo);

/**
 * STEP 2: Generate buyer PSBT for purchase
 * Body: {
 *   listing_id: string,
 *   buyer_payment_address: string,
 *   buyer_receive_address?: string (defaults to payment address),
 *   fee_level?: 'fastestFee' | 'halfHourFee' | 'hourFee' | 'economyFee',
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/generate-buyer', generateBuyerPSBT);

router.post('/combine-psbt',combinePSBTController)
// ============================================================================
// VERIFICATION & VALIDATION
// ============================================================================

/**
 * Verify inscription ownership
 * Body: {
 *   inscription_id: string,
 *   address: string,
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/verify-ownership', verifyOwnership);

/**
 * Validate PSBT structure
 * Body: {
 *   psbt_base64: string,
 *   inscription_output: string,
 *   expected_amount?: number,
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/validate', validatePSBT);

/**
 * Verify signed PSBT
 * Body: {
 *   signed_psbt: string (base64 or hex),
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/verify-signed-psbt', verifySignedPSBT);

/**
 * Decode PSBT or transaction
 * Body: {
 *   encoded_data: string (base64 or hex),
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/decode', decodePSBT);

// ============================================================================
// WALLET INTEGRATION
// ============================================================================

/**
 * Prepare PSBT for wallet signing
 * Body: {
 *   unsigned_psbt: string,
 *   signing_address: string,
 *   network?: 'testnet' | 'mainnet',
 *   wallet_type?: 'unisat' | 'xverse' | 'hiro'
 * }
 */
router.post('/sign-psbt', signPSBTWithWallet);

// ============================================================================
// BROADCASTING
// ============================================================================

/**
 * Broadcast signed transaction
 * Body: {
 *   signed_psbt: string (base64 or hex),
 *   network?: 'testnet' | 'mainnet'
 * }
 */
router.post('/broadcast', broadcastTransaction);

export default router;

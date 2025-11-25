import { 
  generateSellerPSBT as generateSellerPSBTService,
  generateBuyerPSBT as generateBuyerPSBTService,
  verifyOwnership as verifyOwnershipService,
  validatePSBT as validatePSBTService,
  signPSBTWithWalletService,
  verifySignedPSBTService,
  generateSellerPSBTSimple as generateSellerPSBTSimpleService,
  decodePSBTData,
  generateDummyUtxoPSBT,
  broadcastTransactionService,combinePSBTs
} from '../services/psbtService.js';
import { Listing } from '../models/Listing.js';
import Ordinal from '../models/Ordinal.js';
import Collection from '../models/Collection.js';
import { AppError } from '../middleware/errorHandler.js';

const DUMMY_UTXO_VALUE = 1000; // 1000 sats for dummy UTXO


// ============================================================================
// SELLER FLOW - Generate Unsigned PSBT
// ============================================================================

export const generateSellerPSBT = async (req, res, next) => {
  try {
    const {
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address,
      network = 'testnet'
    } = req.body;

    console.log('📝 Step 1: Generating Seller PSBT...');
    // Validate required fields
    if (!inscription_id || !inscription_output || !price_sats || !seller_address) {
      throw new AppError('Missing required fields: inscription_id, inscription_output, price_sats, seller_address', 400);
    }

    // ✅ STEP 1: Verify ownership
    console.log('🔍 Step 2: Verifying ownership...');
    const ownershipResult = await verifyOwnershipService(inscription_id, seller_address, { 
      validateAddressType: true 
    });
    
    if (!ownershipResult.isOwner) {
      throw new AppError(
        `You are not the owner of this inscription. Inscription ${inscription_id} is owned by ${ownershipResult.inscriptionAddress}`,
        403
      );
    }

    console.log('✅ Ownership verified!');

    // ✅ STEP 2: Generate unsigned PSBT
    console.log('🔧 Step 3: Generating unsigned PSBT...');
    const result = await generateSellerPSBTService(
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address || seller_address,
      network
    );

    console.log('✅ Unsigned PSBT generated successfully!');

    res.json({
      success: true,
      message: 'Seller PSBT generated successfully. Please sign this PSBT with your wallet.',
      data: {
        unsigned_psbt: result.psbt,
        metadata: result.metadata,
        next_steps: [
          '1. Sign this PSBT using your Bitcoin wallet (Unisat, Xverse, etc.)',
          '2. Submit the signed PSBT to /api/psbt/create-listing endpoint',
          '3. Your inscription will be listed for sale'
        ],
        signing_instructions: {
          unisat: 'Use UniSat wallet extension -> Sign PSBT',
          xverse: 'Use Xverse wallet -> Advanced -> Sign PSBT',
          sparrow: 'Use Sparrow wallet -> File -> Open Transaction -> Sign'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SELLER FLOW - Create Listing with Signed PSBT
// ============================================================================

export const createListingWithSignedPSBT = async (req, res, next) => {
  try {
    const {
      inscription_id,
      inscription_number,
      inscription_output,
      price_sats,
      price_btc,
      seller_address,
      payment_address,
      unsigned_psbt,
      signed_psbt,
      network = 'testnet'
    } = req.body;

    console.log('📝 Creating listing with PSBT...');

    // Validate required fields
    if (!signed_psbt) {
      throw new AppError('signed_psbt is required', 400);
    }

    // ✅ STEP 1: Verify the PSBT and check signature status
    console.log('🔍 Step 1: Verifying PSBT...');
    const verification = await verifySignedPSBTService(signed_psbt, network);
    
    console.log('📊 PSBT Verification Result:', {
      hasAnySignatures: verification.hasAnySignatures,
      signatureCount: verification.signatureCount,
      isFullySigned: verification.isFullySigned,
      canFinalize: verification.canFinalize,
      inputCount: verification.inputCount
    });

    // Allow partially signed PSBTs but require at least one signature
    if (!verification.hasAnySignatures) {
      throw new AppError(
        'PSBT has no signatures. Please sign the transaction in your wallet before creating a listing.\n\n' +
        'Common issues:\n' +
        '• Make sure you click "Sign" in your wallet\n' +
        '• Wait for the signing to complete\n' +
        '• Don\'t close the wallet popup prematurely',
        400
      );
    }

    // Warn if not fully signed but allow to proceed
    if (!verification.isFullySigned) {
      console.log('⚠️ PSBT is partially signed - this is acceptable for listing');
      console.log(`ℹ️ ${verification.signatureCount}/${verification.inputCount} inputs signed`);
    }

    // Check finalization status but don't block listing creation
    if (!verification.canFinalize) {
      console.log('⚠️ PSBT cannot be finalized yet - will need buyer signature to complete');
      if (verification.finalizeError) {
        console.log('Finalization error:', verification.finalizeError);
      }
    }

    console.log('✅ PSBT verification completed!');

    // ✅ STEP 2: Extract data from PSBT to validate
    console.log('🔍 Step 2: Decoding PSBT data...');
    const decodedData = await decodePSBTData(signed_psbt, network);
    
    // Validate PSBT matches the listing data
    if (decodedData.outputs && decodedData.outputs[0] && decodedData.outputs[0].value !== price_sats) {
      throw new AppError(
        `PSBT price (${decodedData.outputs[0].value} sats) does not match listing price (${price_sats} sats)`,
        400
      );
    }

    // ✅ STEP 3: Find or create ordinal
    console.log('🔍 Step 3: Finding/creating ordinal record...');
    let ordinal = await Ordinal.findOne({ inscription_id });
    
    if (!ordinal) {
      // Create new ordinal record
      ordinal = new Ordinal({
        inscription_id,
        inscription_number: inscription_number || 'Unknown',
        address: seller_address,
        output: inscription_output,
        price_btc: price_btc || (price_sats / 100000000),
        is_listed: true
      });
      await ordinal.save();
      console.log('✅ New ordinal record created');
    } else {
      console.log('✅ Existing ordinal record found');
    }

    // ✅ STEP 4: Check if ordinal belongs to a collection
    let collection = null;
    if (ordinal.collection_slug) {
      collection = await Collection.findOne({ slug: ordinal.collection_slug });
      console.log(`✅ Ordinal belongs to collection: ${collection?.name}`);
    }

    // ✅ STEP 5: Check for existing active listings
    const existingListing = await Listing.findOne({
      inscription_id,
      status: 'active'
    });

    if (existingListing) {
      throw new AppError(
        'This inscription already has an active listing. Please cancel the existing listing first.',
        400
      );
    }

    // ✅ STEP 6: Create listing with PSBT signature status
    console.log('✅ Step 6: Creating listing...');
    const listing = new Listing({
      ordinal: ordinal._id,
      collection: collection?._id,
      inscription_id,
      inscription_number: inscription_number || ordinal.inscription_number,
      inscription_output,
      seller_address,
      payment_address: payment_address || seller_address,
      price_sats,
      price_btc: price_btc || (price_sats / 100000000),
      unsigned_psbt:unsigned_psbt,
      signed_psbt,
      psbt_status: {
        is_partially_signed: !verification.isFullySigned,
        is_fully_signed: verification.isFullySigned,
        can_finalize: verification.canFinalize,
        signature_count: verification.signatureCount,
        total_inputs: verification.inputCount,
        finalization_ready: verification.canFinalize
      },
      status: 'active'
    });

    await listing.save();
    console.log('✅ Listing created successfully!');

    // ✅ STEP 7: Update ordinal listing status
    ordinal.is_listed = true;
    ordinal.listing_id = listing._id;
    ordinal.price_btc = listing.price_btc;
    await ordinal.save();
    console.log('✅ Ordinal updated with listing');

    // ✅ STEP 8: Update collection floor price if applicable
    if (collection) {
      await collection.updateFloorPrice();
      console.log('✅ Collection floor price updated');
    }

    // Populate and return
    await listing.populate('ordinal collection');

    // Prepare response message based on PSBT status
    let statusMessage = 'Listing created successfully! Your inscription is now listed for sale.';
    if (!verification.isFullySigned) {
      statusMessage += `\n\n⚠️ Note: This listing is partially signed (${verification.signatureCount}/${verification.inputCount} inputs). ` +
                      'The buyer will need to provide the remaining signatures to complete the purchase.';
    }

    res.status(201).json({
      success: true,
      message: statusMessage,
      data: {
        listing: {
          id: listing._id,
          inscription_id: listing.inscription_id,
          inscription_number: listing.inscription_number,
          price_sats: listing.price_sats,
          price_btc: listing.price_btc,
          seller_address: listing.seller_address,
          status: listing.status,
          psbt_status: listing.psbt_status,
          created_at: listing.createdAt,
          expires_at: listing.expires_at,
          listing_url: `/listings/${listing._id}`,
          ordinal: listing.ordinal,
          collection: listing.collection
        },
        psbt_info: {
          signature_status: `${verification.signatureCount}/${verification.inputCount} inputs signed`,
          fully_signed: verification.isFullySigned,
          ready_for_finalization: verification.canFinalize
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// BUYER FLOW - Generate Buyer PSBT
// ============================================================================

export const generateBuyerPSBT = async (req, res, next) => {
  try {
    const {
      listing_id,
      buyer_payment_address,
      buyer_receive_address,
      fee_level = 'hourFee',
      network = 'testnet'
    } = req.body;

    console.log('🛒 Generating Buyer PSBT...');

    // Validate required fields
    if (!listing_id || !buyer_payment_address) {
      throw new AppError('Missing required fields: listing_id, buyer_payment_address', 400);
    }

    // Use payment address as receive address if not specified
    const receiveAddress = buyer_receive_address || buyer_payment_address;

    // ✅ STEP 1: Fetch listing
    console.log('🔍 Step 1: Fetching listing...');
    const listing = await Listing.findById(listing_id).populate('ordinal collection');
    
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.status !== 'active') {
      throw new AppError(`Listing is ${listing.status}. Only active listings can be purchased.`, 400);
    }
    console.log('✅ Listing found:', listing);

    console.log('✅ Listing found:', listing.inscription_id);

    // ✅ STEP 2: Validate buyer is not the seller
    if (listing.seller_address === buyer_payment_address || 
        listing.seller_address === receiveAddress) {
      throw new AppError('Cannot buy your own listing', 400);
    }

    // ✅ STEP 3: Generate buyer PSBT
    console.log('🔧 Step 3: Generating buyer PSBT...');
    const result = await generateBuyerPSBTService(
      listing,
      buyer_payment_address,
      receiveAddress,
      network,
      fee_level
    );

    console.log('✅ Buyer PSBT generated successfully!');

    // Dynamic message based on dummy UTXO status
    const dummyUtxoMessage = result.metadata.dummyUtxoStatus === 'existing' 
      ? 'Using existing dummy UTXO.' 
      : 'Creating new dummy UTXO as part of this transaction.';

    res.json({
      success: true,
      message: `Buyer PSBT generated successfully. ${dummyUtxoMessage}`,
      data: {
        unsigned_psbt: result.psbt,
        metadata: result.metadata,
        listing: {
          id: listing._id,
          inscription_id: listing.inscription_id,
          inscription_number: listing.inscription_number,
          price_sats: listing.price_sats,
          price_btc: listing.price_btc,
          seller_address: listing.seller_address,
          ordinal: listing.ordinal
        },
        transaction_details: {
          total_cost_sats: listing.price_sats + result.metadata.estimatedFee + 
                          (result.metadata.dummyUtxoStatus === 'creating_new' ? DUMMY_UTXO_VALUE : 0),
          total_cost_btc: (listing.price_sats + result.metadata.estimatedFee + 
                          (result.metadata.dummyUtxoStatus === 'creating_new' ? DUMMY_UTXO_VALUE : 0)) / 100000000,
          price_sats: listing.price_sats,
          fee_sats: result.metadata.estimatedFee,
          fee_rate: result.metadata.feeRate,
          change_sats: result.metadata.changeAmount,
          dummy_utxo_included: result.metadata.dummyUtxoStatus === 'creating_new'
        },
        next_steps: [
          '1. Sign this PSBT using your Bitcoin wallet',
          '2. Broadcast the signed transaction to the network',
          '3. Wait for confirmation',
          '4. The ordinal will be transferred to your receive address'
        ].concat(result.metadata.dummyUtxoStatus === 'creating_new' ? 
          ['5. A new dummy UTXO will be created for future purchases'] : 
          ['5. Your existing dummy UTXO will be recreated for future purchases']),
        warnings: [
          'Ensure your receive address is a Taproot address (starts with bc1p or tb1p)',
          'Double-check the transaction details before signing',
          'Make sure you have enough funds including fees'
        ]
      }
    });
  } catch (error) {
    // Enhanced error handling
    if (error.message.includes('Invalid PSBT format') || error.message.includes('Invalid Magic Number')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller PSBT format',
        message: 'The seller PSBT in this listing appears to be corrupted or in an unsupported format.',
        help: {
          issue: 'Seller PSBT format error',
          possible_causes: [
            'PSBT stored as hex instead of base64',
            'PSBT data is corrupted',
            'Data is actually a raw transaction'
          ],
          solution: 'The seller may need to recreate the listing with a valid PSBT'
        }
      });
    }
    
    if (error.message.includes('Insufficient funds')) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        message: error.message,
        help: {
          what_you_need: 'Price + Fees' + (error.message.includes('Dummy UTXO') ? ' + Dummy UTXO (1000 sats)' : ''),
          check_balance: 'Make sure you have enough BTC in your payment address'
        }
      });
    }
    
    next(error);
  }
};

// ============================================================================
// DUMMY UTXO GENERATION
// ============================================================================

export const generateDummyUtxo = async (req, res, next) => {
  try {
    const {
      payer_address,
      number_of_dummy_utxos = 1,
      network = 'testnet',
      fee_level = 'hourFee'
    } = req.body;

    console.log('🔧 Generating dummy UTXO creation PSBT...');

    if (!payer_address) {
      throw new AppError('payer_address is required', 400);
    }

    if (number_of_dummy_utxos < 1 || number_of_dummy_utxos > 10) {
      throw new AppError('number_of_dummy_utxos must be between 1 and 10', 400);
    }

    const result = await generateDummyUtxoPSBT(
      payer_address,
      number_of_dummy_utxos,
      network,
      fee_level
    );

    res.json({
      success: true,
      message: `Dummy UTXO creation PSBT generated. Sign and broadcast to create ${number_of_dummy_utxos} dummy UTXO(s).`,
      data: {
        unsigned_psbt: result.psbt,
        metadata: result.metadata,
        explanation: {
          what_is_dummy_utxo: 'A dummy UTXO is a 1000 sats UTXO used to facilitate ordinal purchases',
          why_needed: 'Dummy UTXOs allow you to buy ordinals while maintaining proper UTXO management',
          how_many: 'We recommend having 1-3 dummy UTXOs for regular trading'
        },
        next_steps: [
          '1. Sign this PSBT with your wallet',
          '2. Broadcast the transaction',
          '3. Wait for confirmation',
          '4. You can now purchase ordinals!'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PSBT VERIFICATION AND UTILITIES
// ============================================================================

export const verifyOwnership = async (req, res, next) => {
  try {
    const { inscription_id, address, network = 'testnet' } = req.body;

    if (!inscription_id || !address) {
      throw new AppError('Missing required fields: inscription_id and address', 400);
    }

    const result = await verifyOwnershipService(inscription_id, address, {
      validateAddressType: true
    });

    res.json({
      success: true,
      data: {
        is_owner: result.isOwner,
        inscription_id,
        address,
        address_type: result.addressType,
        inscription_address: result.inscriptionAddress,
        inscription_address_type: result.inscriptionAddressType
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validatePSBT = async (req, res, next) => {
  try {
    const { psbt_base64, inscription_output, expected_amount, network = 'testnet' } = req.body;

    if (!psbt_base64 || !inscription_output) {
      throw new AppError('Missing required fields: psbt_base64 and inscription_output', 400);
    }

    const isValid = await validatePSBTService(psbt_base64, inscription_output, expected_amount, network);

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

export const decodePSBT = async (req, res, next) => {
  try {
    const { encoded_data, network = 'testnet' } = req.body;

    if (!encoded_data) {
      throw new AppError('encoded_data is required', 400);
    }

    console.log('🔍 Decoding PSBT/Transaction data...');

    const decodedData = await decodePSBTData(encoded_data, network);

    res.json({
      success: true,
      message: 'Data decoded successfully',
      data: decodedData
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// WALLET SIGNING INTEGRATION
// ============================================================================

export const signPSBTWithWallet = async (req, res, next) => {
  try {
    const {
      unsigned_psbt,
      signing_address,
      network = 'testnet',
      wallet_type = 'unisat'
    } = req.body;

    if (!unsigned_psbt || !signing_address) {
      throw new AppError('unsigned_psbt and signing_address are required', 400);
    }

    console.log('🔏 Initiating wallet signing...');

    const result = await signPSBTWithWalletService(
      unsigned_psbt,
      signing_address,
      network,
      wallet_type
    );

    res.json({
      success: true,
      message: 'PSBT prepared for wallet signing',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const verifySignedPSBT = async (req, res, next) => {
  try {
    const { signed_psbt, network = 'testnet' } = req.body;

    if (!signed_psbt) {
      throw new AppError('signed_psbt is required', 400);
    }

    console.log('🔍 Verifying signed PSBT...');

    const result = await verifySignedPSBTService(signed_psbt, network);

    res.json({
      success: true,
      message: result.isFullySigned ? 
        'PSBT is fully signed and ready' : 
        'PSBT verification completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// TRANSACTION BROADCASTING
// ============================================================================
// ✅ CORRECT: This is your CONTROLLER function (with req, res, next)
export const broadcastTransaction = async (req, res, next) => {
  try {
    const { signed_psbt, network = 'testnet' } = req.body;

    if (!signed_psbt) {
      throw new AppError('signed_psbt is required', 400);
    }

    // ✅ AWAIT the service call and get the result
    console.log('🔄 Calling broadcast service...');
    const result = await broadcastTransactionService(signed_psbt, network);
    
    console.log('✅ Service call completed:', result.message);
    
    // Send the response
    res.json(result);

  } catch (error) {
    console.error('\n❌ CONTROLLER ERROR:');
    console.error('📋 Error:', error.message);
    
    // Pass error to Express error handler
    next(error);
  }
};

// Export simple PSBT generation for compatibility
export const generateSellerPSBTSimple = async (req, res, next) => {
  try {
    const {
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address,
      network = 'testnet'
    } = req.body;

    if (!inscription_id || !inscription_output || !price_sats || !seller_address) {
      throw new AppError('Missing required fields', 400);
    }

    const result = await generateSellerPSBTSimpleService(
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address || seller_address,
      network
    );

    res.json({
      success: true,
      message: 'Simple Seller PSBT generated successfully',
      data: {
        unsigned_psbt: result.psbt,
        metadata: result.metadata,
        method: 'simple'
      }
    });
  } catch (error) {
    next(error);
  }
};
export const combinePSBTController = async (req, res, next) => {
  try {
    console.log('📥 Combine PSBT Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      sellerSignedPsbt, 
      buyerSignedPsbt, 
      metadata, 
      network = 'testnet' 
    } = req.body;

    // Validate required fields
    if (!sellerSignedPsbt) {
      throw new AppError('Missing sellerSignedPsbt in request body', 400);
    }

    if (!buyerSignedPsbt) {
      throw new AppError('Missing buyerSignedPsbt in request body', 400);
    }

    if (!metadata) {
      throw new AppError('Missing metadata in request body', 400);
    }

    // Validate metadata has required fields
    if (!metadata.sellerInputTxid || metadata.sellerInputIndex === undefined) {
      throw new AppError(
        'Metadata must include sellerInputTxid and sellerInputIndex. ' +
        'Please generate buyer PSBT first to get the complete metadata.',
        400
      );
    }

    if (!metadata.sellerUtxoValue) {
      throw new AppError('Metadata must include sellerUtxoValue', 400);
    }

    console.log('✅ All required fields present');
    console.log('📊 Metadata:', {
      sellerInputTxid: metadata.sellerInputTxid,
      sellerInputIndex: metadata.sellerInputIndex,
      sellerUtxoValue: metadata.sellerUtxoValue,
      priceSats: metadata.priceSats,
      network: metadata.network
    });

    const result = await combinePSBTs(
      sellerSignedPsbt,
      buyerSignedPsbt,
      metadata,
      network
    );

    res.json({
      success: true,
      message: 'PSBTs combined successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ CONTROLLER ERROR:', error);
    next(error);
  }
};
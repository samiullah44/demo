import { 
  generateSellerPSBT as generateSellerPSBTService,
  generateBuyerPSBT  as generateBuyerPSBTService,
  verifyOwnership as verifyOwnershipService,
  validatePSBT as validatePSBTService,
  signPSBTWithWalletService,
  verifySignedPSBTService,
  generateSellerPSBTSimple as generateSellerPSBTSimpleService,
  decodePSBTData,
  generateDummyUtxoPSBT,
  broadcastTransactionService
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

    console.log('📝 Generating Seller PSBT (OpenOrdex Compatible)...');
    
    // Validate required fields
    if (!inscription_id || !inscription_output || !price_sats || !seller_address) {
      throw new AppError('Missing required fields: inscription_id, inscription_output, price_sats, seller_address', 400);
    }

    // ✅ STEP 1: Verify ownership
    console.log('🔍 Step 1: Verifying ownership...');
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

    // ✅ STEP 2: Generate unsigned PSBT with OpenOrdex structure
    console.log('🔧 Step 2: Generating OpenOrdex-compatible PSBT...');
    const result = await generateSellerPSBTService(
      inscription_id,
      inscription_output,
      price_sats,
      seller_address,
      payment_address || seller_address,
      network
    );

    console.log('✅ OpenOrdex-compatible PSBT generated successfully!');

    res.json({
      success: true,
      message: 'Seller PSBT generated successfully with OpenOrdex compatibility.',
      data: {
        unsigned_psbt: result.psbt,
        metadata: result.metadata,
        openordex_compatibility: {
          sighash_type: 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY',
          structure: '1 input (inscription), 1 output (payment)',
          description: 'This PSBT can be extended by buyers following OpenOrdex protocol'
        },
        next_steps: [
          '1. Sign this PSBT using your Bitcoin wallet (Unisat, Xverse, Hiro, etc.)',
          '2. Submit the signed PSBT to create your listing',
          '3. Buyers will extend your signed PSBT with their payment inputs',
          '4. The transaction will execute atomically when broadcast'
        ],
        important_notes: [
          'This PSBT uses SIGHASH_SINGLE|ANYONECANPAY to allow buyers to add inputs',
          'Do NOT change the output ordering after signing',
          'Your signature commits to receiving the specified price at output index 0'
        ],
        signing_instructions: {
          unisat: 'Use UniSat wallet extension -> Sign PSBT',
          xverse: 'Use Xverse wallet -> Advanced -> Sign PSBT', 
          hiro: 'Use Hiro wallet -> Sign PSBT',
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
  let retryCount = 0;
  const maxRetries = 2;
  
  const attemptCreate = async () => {
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

      console.log(`📝 Creating listing with PSBT (attempt ${retryCount + 1})...`);

      // ✅ Validate required fields
      if (!inscription_id || inscription_id === 'null' || inscription_id === 'undefined') {
        throw new AppError('Valid inscription_id is required', 400);
      }

      if (!signed_psbt) {
        throw new AppError('signed_psbt is required', 400);
      }

      if (!inscription_output) {
        throw new AppError('inscription_output (txid:vout) is required', 400);
      }

      console.log('🔗 Inscription ID:', inscription_id);
      console.log('📍 Inscription Output:', inscription_output);

      // ✅ STEP 1: Verify PSBT
      console.log('🔍 Step 1: Verifying PSBT...');
      const verification = await verifySignedPSBTService(signed_psbt, network);
      
      if (!verification.hasAnySignatures) {
        throw new AppError('PSBT has no signatures', 400);
      }

      console.log('✅ PSBT verification completed!');

      // ✅ STEP 2: Decode PSBT data
      console.log('🔍 Step 2: Decoding PSBT data...');
      const decodedData = await decodePSBTData(signed_psbt, network);
      
      if (decodedData.outputs && decodedData.outputs[0] && decodedData.outputs[0].value !== price_sats) {
        throw new AppError(`PSBT price mismatch`, 400);
      }

      // ✅ STEP 3: Find or create ordinal
      console.log('🔍 Step 3: Finding/creating ordinal record...');
      let ordinal = await Ordinal.findOne({ inscription_id });
      
      if (!ordinal) {
        ordinal = new Ordinal({
          inscription_id,
          inscription_number: inscription_number || 'Unknown',
          address: seller_address,
          output: inscription_output,
          price_btc: (price_sats / 100000000),
          is_listed: true
        });
        await ordinal.save();
        console.log('✅ New ordinal record created');
      } else {
        console.log('✅ Existing ordinal record found');
      }

      // ✅ STEP 4: Check collection
      let collection = null;
      if (ordinal.collection_slug) {
        collection = await Collection.findOne({ slug: ordinal.collection_slug });
      }

      // ✅ STEP 5: Check for existing active listings
      const existingActiveListing = await Listing.findOne({
        inscription_id,
        status: 'active'
      });

      if (existingActiveListing) {
        throw new AppError('This inscription already has an active listing', 400);
      }
      console.log('🔍 Existing active listing check: NONE');

      // ✅ STEP 6: Create listing with ATOMIC OPERATION
      console.log('✅ Step 6: Creating listing...');
      
      const listingData = {
        ordinal: ordinal._id,
        collection: collection?._id,
        inscription_id,
        inscription_number: inscription_number || ordinal.inscription_number,
        inscription_output,
        seller_address,
        payment_address: payment_address || seller_address,
        price_sats,
        price_btc: (price_sats / 100000000),
        unsigned_psbt: unsigned_psbt,
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
      };

      console.log('📋 Listing data prepared:', {
        inscription_id: listingData.inscription_id,
        status: listingData.status,
        price_sats: listingData.price_sats
      });

      // ✅ ATOMIC OPERATION: Find and update or create
      let listing;
      try {
        // Try to find and update any existing inactive listing first
        const existingInactive = await Listing.findOneAndUpdate(
          {
            inscription_id,
            status: { $ne: 'active' } // Find non-active listings
          },
          { $set: listingData },
          { new: true, upsert: false } // Don't upsert, just update
        );

        if (existingInactive) {
          listing = existingInactive;
          console.log('✅ Updated existing inactive listing');
        } else {
          // Create new listing
          listing = new Listing(listingData);
          await listing.save();
          console.log('✅ New listing created successfully!');
        }
      } catch (saveError) {
        console.log('❌ Listing save error:', {
          code: saveError.code,
          message: saveError.message,
          keyPattern: saveError.keyPattern,
          keyValue: saveError.keyValue
        });

        // If it's a duplicate key error, try to find the conflicting document
        if (saveError.code === 11000) {
          console.log('⚠️ Duplicate error but no active listing found - possible stale index');
          
          // Try to find ANY listing with this inscription_id
          const conflicting = await Listing.findOne({ inscription_id });
          if (conflicting) {
            console.log('🔄 Found conflicting listing via direct search:', conflicting.status);
            
            if (conflicting.status === 'active') {
              throw new AppError('Active listing found on retry', 400);
            } else {
              // Update the inactive listing
              Object.assign(conflicting, listingData);
              listing = await conflicting.save();
              console.log('✅ Updated found conflicting listing');
            }
          } else {
            // Nuclear option: Force insert ignoring duplicates
            if (retryCount < maxRetries) {
              console.log('🔄 Retrying creation...');
              retryCount++;
              return attemptCreate();
            } else {
              throw new AppError('Unable to create listing due to a database conflict. Please try again in a moment.', 500);
            }
          }
        } else {
          throw saveError;
        }
      }

      // ✅ STEP 7: Update ordinal
      ordinal.is_listed = true;
      ordinal.listing_id = listing._id;
      ordinal.price_btc = listing.price_btc;
      await ordinal.save();
      console.log('✅ Ordinal updated with listing');

      // Populate and return
      await listing.populate('ordinal collection');

      res.status(201).json({
        success: true,
        message: 'Listing created successfully!',
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
            created_at: listing.createdAt
          }
        }
      });

    } catch (error) {
      if (retryCount < maxRetries && error.code === 11000) {
        console.log(`🔄 Retry ${retryCount + 1} due to duplicate key...`);
        retryCount++;
        return attemptCreate();
      }
      throw error;
    }
  };

  try {
    await attemptCreate();
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

    console.log('🛒 Generating Buyer PSBT (OpenOrdex Single-PSBT Flow)...');

    // Validate required fields
    if (!listing_id || !buyer_payment_address) {
      throw new AppError('Missing required fields: listing_id, buyer_payment_address', 400);
    }

    // Use payment address as receive address if not specified
    const receiveAddress = buyer_receive_address || buyer_payment_address;

    // ✅ STEP 1: Fetch listing with signed PSBT
    console.log('🔍 Step 1: Fetching listing with seller signed PSBT...');
    const listing = await Listing.findById(listing_id).populate('ordinal collection');
    
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.status !== 'active') {
      throw new AppError(`Listing is ${listing.status}. Only active listings can be purchased.`, 400);
    }

    // ✅ Validate seller PSBT exists in listing
    if (!listing.signed_psbt) {
      throw new AppError('Seller PSBT not found in listing. The listing may be corrupted.', 400);
    }

    console.log('✅ Listing found with seller signed PSBT');

    // ✅ STEP 2: Validate buyer is not the seller
    if (listing.seller_address === buyer_payment_address || 
        listing.seller_address === receiveAddress) {
      throw new AppError('Cannot buy your own listing', 400);
    }

    // ✅ STEP 3: Generate OpenOrdex-style buyer PSBT (extends seller PSBT)
    console.log('🔧 Step 3: Generating OpenOrdex-style buyer PSBT...');
    const result = await generateBuyerPSBTService(
      listing,
      buyer_payment_address,
      receiveAddress,
      network,
      fee_level
    );

    console.log('✅ OpenOrdex buyer PSBT generated successfully!');

    // Response structure optimized for OpenOrdex flow
    res.json({
      success: true,
      message: `Buyer PSBT generated successfully using OpenOrdex single-PSBT flow.`,
      data: {
        unsigned_psbt: result.psbt, // This is the EXTENDED PSBT ready for buyer signing
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
                          (result.metadata.dummyStatus === 'creating_new' ? DUMMY_UTXO_VALUE : 0),
          total_cost_btc: (listing.price_sats + result.metadata.estimatedFee + 
                          (result.metadata.dummyStatus === 'creating_new' ? DUMMY_UTXO_VALUE : 0)) / 100000000,
          price_sats: listing.price_sats,
          fee_sats: result.metadata.estimatedFee,
          fee_rate: result.metadata.feeRate,
          change_sats: result.metadata.changeAmount,
          dummy_utxo_included: result.metadata.dummyStatus === 'creating_new'
        },
        openordex_flow: {
          type: 'single_psbt_extended',
          description: 'This PSBT extends the seller\'s signed PSBT with your payment inputs',
          seller_signature_preserved: true,
          sighash_type: 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY (seller) + SIGHASH_ALL (buyer)'
        },
        next_steps: [
          '1. Sign this EXTENDED PSBT using your Bitcoin wallet',
          '2. Submit the signed PSBT to /api/psbt/finalize-broadcast endpoint',
          '3. The transaction will be finalized and broadcast automatically',
          '4. Wait for confirmation',
          '5. The ordinal will be transferred to your receive address'
        ].concat(result.metadata.dummyStatus === 'creating_new' ? 
          ['6. A new dummy UTXO will be created for future purchases'] : 
          ['6. Your existing dummy UTXO will be recreated for future purchases']),
        warnings: [
          'Do NOT modify the PSBT structure - seller signature depends on output ordering',
          'Ensure your receive address is a Taproot address (starts with bc1p or tb1p)',
          'The seller signature is already included and must be preserved'
        ]
      }
    });
  } catch (error) {
    // Enhanced error handling for OpenOrdex flow
    if (error.message.includes('Invalid seller PSBT structure')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller PSBT in listing',
        message: 'The seller PSBT in this listing has an invalid structure for OpenOrdex flow.',
        help: {
          issue: 'Seller PSBT structure error',
          possible_causes: [
            'Seller PSBT does not have exactly 1 input and 1 output',
            'Seller PSBT was not created with SIGHASH_SINGLE|ANYONECANPAY',
            'PSBT data is corrupted or modified'
          ],
          solution: 'The seller may need to recreate the listing with a valid PSBT'
        }
      });
    }
    
    if (error.message.includes('No signed seller PSBT found')) {
      return res.status(400).json({
        success: false,
        error: 'Missing seller signature',
        message: 'This listing does not contain a signed seller PSBT.',
        help: {
          issue: 'Seller has not signed the PSBT',
          solution: 'The seller must sign and submit their PSBT before the listing can be purchased'
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
          check_balance: 'Make sure you have enough BTC in your payment address including the dummy UTXO requirement'
        }
      });
    }
    
    next(error);
  }
};

// EMERGENCY: Remove stale indexes and fix the issue
export const emergencyIndexCleanup = async () => {
  try {
    console.log('🚨 EMERGENCY INDEX CLEANUP...');
    
    // Get current indexes
    const currentIndexes = await Listing.collection.getIndexes();
    console.log('📊 Current indexes:', Object.keys(currentIndexes));
    
    // List all indexes to see the problem
    console.log('🔍 All index details:');
    Object.entries(currentIndexes).forEach(([name, index]) => {
      console.log(`   ${name}:`, index.key);
    });
    
    // Remove the problematic inscriptionId_1 index if it exists
    if (currentIndexes.inscriptionId_1) {
      console.log('🗑️ Removing stale inscriptionId_1 index...');
      await Listing.collection.dropIndex('inscriptionId_1');
      console.log('✅ Stale index removed');
    }
    
    // Also check for any other problematic indexes
    const problematicIndexes = Object.keys(currentIndexes).filter(name => 
      name.includes('inscriptionId') || 
      (currentIndexes[name].key && currentIndexes[name].key.inscriptionId)
    );
    
    for (const indexName of problematicIndexes) {
      console.log(`🗑️ Removing problematic index: ${indexName}`);
      await Listing.collection.dropIndex(indexName);
    }
    
    // Drop ALL indexes and recreate them (nuclear option)
    console.log('💥 Dropping ALL indexes...');
    await Listing.collection.dropIndexes();
    
    // Recreate proper indexes
    console.log('🔧 Recreating proper indexes...');
    await Listing.ensureIndexes();
    
    // Verify new indexes
    const newIndexes = await Listing.collection.getIndexes();
    console.log('✅ New indexes:', Object.keys(newIndexes));
    
    // Clean up any listings with null inscription_id
    console.log('🧹 Cleaning null inscription_id records...');
    const nullDeletion = await Listing.deleteMany({
      $or: [
        { inscription_id: null },
        { inscription_id: 'null' },
        { inscription_id: 'undefined' },
        { inscription_id: '' }
      ]
    });
    console.log(`🗑️ Removed ${nullDeletion.deletedCount} null records`);
    
    return {
      removed_stale_indexes: problematicIndexes.length,
      removed_null_records: nullDeletion.deletedCount,
      new_indexes: Object.keys(newIndexes)
    };
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    throw error;
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
    console.log('🎯 Finalize & Broadcast Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      buyer_extended_psbt, 
      network = 'testnet' 
    } = req.body;

    // Validate required fields
    if (!buyer_extended_psbt) {
      throw new AppError('Missing buyer_extended_psbt in request body', 400);
    }

    console.log('✅ All required fields present');
    console.log('📏 Buyer extended PSBT length:', buyer_extended_psbt.length);

    // ✅ Finalize and broadcast the extended PSBT
    const result = await broadcastTransactionService(
      buyer_extended_psbt,
      network
    );

    console.log('✅ Transaction finalized and broadcast successfully!');

    res.json({
      success: true,
      message: 'Transaction finalized and broadcast successfully',
      data: {
        txid: result.txid,
        explorer_url: result.explorer_url,
        network: network,
        status: 'broadcasted',
        timestamp: new Date().toISOString()
      },
      next_steps: [
        '1. Monitor transaction confirmation on the blockchain explorer',
        '2. The ordinal transfer will complete once the transaction confirms',
        '3. Your dummy UTXO will be available for future purchases'
      ]
    });

  } catch (error) {
    console.error('❌ FINALIZE & BROADCAST CONTROLLER ERROR:', error);
    
    // Enhanced error handling for OpenOrdex specific issues
    if (error.message.includes('SIGHASH_SINGLE') || error.message.includes('seller signature')) {
      return res.status(400).json({
        success: false,
        error: 'Seller signature validation failed',
        message: 'The seller signature could not be validated in the extended PSBT.',
        help: {
          issue: 'Seller signature incompatible with transaction structure',
          possible_causes: [
            'Output ordering was changed after seller signed',
            'Seller PSBT was created without SIGHASH_SINGLE|ANYONECANPAY',
            'Buyer modified the PSBT structure incorrectly'
          ],
          solution: 'Ensure the seller PSBT uses correct sighash type and output ordering is preserved'
        }
      });
    }
    
    if (error.message.includes('Failed to finalize input')) {
      return res.status(400).json({
        success: false,
        error: 'PSBT finalization failed',
        message: error.message,
        help: {
          issue: 'One or more inputs could not be finalized',
          possible_causes: [
            'Buyer did not sign all their inputs',
            'Wallet signature format is incompatible',
            'PSBT was modified after signing'
          ],
          solution: 'Ensure all buyer inputs are properly signed and the PSBT structure is preserved'
        }
      });
    }
    
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
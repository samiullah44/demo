import { 
  generateSellerPSBT as generateSellerPSBTService,
  generateBuyerPSBT as generateBuyerPSBTService,
  verifyOwnership as verifyOwnershipService,
  validatePSBT as validatePSBTService,
  signPSBTWithWalletService,
  verifySignedPSBTService,
  generateSellerPSBTSimple as generateSellerPSBTSimpleService,
  decodePSBTData,
  generateDummyUtxoPSBT
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
export const broadcastTransaction = async (req, res, next) => {
  let txId = null;
  let txHex = null;
  
  try {
    const { signed_psbt, network = 'testnet' } = req.body;

    if (!signed_psbt) {
      throw new AppError('signed_psbt is required', 400);
    }

    console.log('📡 Broadcasting transaction...');
    console.log('🌐 Network:', network);
    console.log('📦 PSBT length:', signed_psbt.length);
    console.log('🔍 PSBT format:', signed_psbt.startsWith('70736274') ? 'HEX' : 'BASE64');

    // Import bitcoinjs-lib dynamically
    const bitcoin = await import('bitcoinjs-lib');
    const networkConfig = network === 'testnet' 
      ? bitcoin.networks.testnet 
      : bitcoin.networks.bitcoin;
    
    // Parse PSBT
    let psbt;
    try {
      console.log('🔄 Parsing PSBT...');
      if (signed_psbt.startsWith('70736274')) {
        psbt = bitcoin.Psbt.fromHex(signed_psbt, { network: networkConfig });
        console.log('✅ PSBT parsed as HEX');
      } else {
        psbt = bitcoin.Psbt.fromBase64(signed_psbt, { network: networkConfig });
        console.log('✅ PSBT parsed as BASE64');
      }
    } catch (error) {
      console.error('❌ PSBT parsing failed:', error.message);
      throw new AppError(`Invalid PSBT format: ${error.message}`, 400);
    }

    // 🔍 DEBUG: Analyze PSBT before finalization
    console.log('\n🔍 PSBT ANALYSIS BEFORE FINALIZATION:');
    console.log('📊 PSBT Version:', psbt.version);
    console.log('🔢 Input Count:', psbt.inputCount);
    console.log('📤 Output Count:', psbt.txOutputs.length);
    console.log('⏰ Locktime:', psbt.locktime);

    // Analyze each input
    console.log('\n📋 INPUT ANALYSIS:');
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.txInputs[i];
      const inputData = psbt.data.inputs[i];
      
      const txid = input.hash.reverse().toString('hex');
      const txid1 = input.hash.toString('hex');
      console.log(txid1);
      const vout = input.index;
      
      console.log(`  Input ${i}:`);
      console.log(`    TXID: ${txid}`);
      console.log(`    VOUT: ${vout}`);
      console.log(`    Sequence: ${input.sequence}`);
      
      // Signature analysis
      const hasTraditionalSig = inputData.partialSig && inputData.partialSig.length > 0;
      const hasTaprootSig = !!inputData.tapKeySig;
      const hasTapScriptSig = inputData.tapScriptSig && Object.keys(inputData.tapScriptSig).length > 0;
      const traditionalSigCount = hasTraditionalSig ? inputData.partialSig.length : 0;
      const tapScriptSigCount = hasTapScriptSig ? Object.keys(inputData.tapScriptSig).length : 0;
      const totalSigCount = traditionalSigCount + (hasTaprootSig ? 1 : 0) + tapScriptSigCount;
      
      console.log(`    Signatures:`, {
        traditional: hasTraditionalSig,
        traditionalCount: traditionalSigCount,
        taproot: hasTaprootSig,
        tapscript: hasTapScriptSig,
        tapscriptCount: tapScriptSigCount,
        total: totalSigCount
      });
      
      // UTXO data
      console.log(`    UTXO Data:`, {
        witnessUtxo: !!inputData.witnessUtxo,
        nonWitnessUtxo: !!inputData.nonWitnessUtxo,
        value: inputData.witnessUtxo ? inputData.witnessUtxo.value + ' sats' : 'unknown'
      });
      
      // Finalization status
      console.log(`    Finalization:`, {
        finalScriptSig: !!inputData.finalScriptSig,
        finalScriptWitness: !!inputData.finalScriptWitness
      });
    }

    // Analyze outputs
    console.log('\n📤 OUTPUT ANALYSIS:');
    psbt.txOutputs.forEach((output, i) => {
      try {
        const address = bitcoin.address.fromOutputScript(output.script, networkConfig);
        console.log(`  Output ${i}: ${address} - ${output.value} sats`);
      } catch (e) {
        console.log(`  Output ${i}: Unknown script - ${output.value} sats`);
      }
    });

    // Finalize all inputs
    console.log('\n🔧 FINALIZING INPUTS:');
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        console.log(`  Finalizing input ${i}...`);
        psbt.finalizeInput(i);
        console.log(`  ✅ Input ${i} finalized successfully`);
      } catch (e) {
        console.log(`  ⚠️ Input ${i} finalization: ${e.message}`);
      }
    }

    // Extract transaction
    console.log('\n📄 EXTRACTING TRANSACTION...');
    const tx = psbt.extractTransaction();
    txHex = tx.toHex();
    txId = tx.getId();

    console.log('✅ Transaction extracted successfully!');
    console.log('📄 Transaction ID:', txId);
    console.log('📄 Transaction Size:', txHex.length / 2, 'bytes');
    console.log('📄 Transaction Hex (first 200 chars):', txHex.substring(0, 200) + '...');

    const baseUrl = network === 'testnet'
      ? 'https://mempool.space/testnet/api'
      : 'https://mempool.space/api';

    // 🔍 COMPREHENSIVE PRE-BROADCAST CHECKS
    console.log('\n🔍 COMPREHENSIVE PRE-BROADCAST CHECKS:');

    // 1. Check if transaction already exists
    console.log('1. Checking if transaction already exists...');
    try {
      const txCheck = await fetch(`${baseUrl}/tx/${txId}`);
      if (txCheck.ok) {
        console.log(`❌ TRANSACTION ${txId} ALREADY EXISTS IN NETWORK!`);
        
        // Get detailed status
        const txStatus = await fetch(`${baseUrl}/tx/${txId}/status`);
        if (txStatus.ok) {
          const status = await txStatus.json();
          console.log('📊 Transaction status:', status);
          
          if (status.confirmed) {
            throw new AppError(
              `Transaction ${txId} is already CONFIRMED on blockchain! The trade completed successfully.`,
              400
            );
          } else {
            // Get more details about the unconfirmed transaction
            const txDetails = await fetch(`${baseUrl}/tx/${txId}`);
            if (txDetails.ok) {
              const details = await txDetails.json();
              console.log('📋 Transaction details:', {
                status: details.status,
                confirmations: details.status.confirmed ? details.confirmations : 0,
                firstSeen: details.status.block_time || details.status.first_seen
              });
            }
            
            throw new AppError(
              `Transaction ${txId} is already in mempool (unconfirmed). Wait for confirmation or try again later.`,
              400
            );
          }
        }
        
        throw new AppError(`Transaction ${txId} already exists in network`, 400);
      } else {
        console.log(`✅ Transaction ${txId} not found in network`);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.log(`⚠️ Transaction existence check failed: ${error.message}`);
    }

    // 2. Check UTXO status and conflicts
    console.log('2. Checking UTXO status and conflicts...');
    let hasConflicts = false;
    let conflictDetails = [];

    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.txInputs[i];
      const txid = input.hash.reverse().toString('hex');
      const vout = input.index;
      
      console.log(`  Checking UTXO ${txid}:${vout}...`);
      
      try {
        const response = await fetch(`${baseUrl}/tx/${txid}/outspend/${vout}`);
        if (response.ok) {
          const spendStatus = await response.json();
          console.log(`  UTXO ${txid}:${vout}:`, {
            spent: spendStatus.spent,
            spendingTx: spendStatus.txid || 'none',
            spendingIndex: spendStatus.vout || 'none'
          });
          
          if (spendStatus.spent) {
            if (spendStatus.txid === txId) {
              console.log(`  ✅ UTXO is being spent by THIS transaction (expected)`);
            } else {
              console.log(`❌ CONFLICT: UTXO ${txid}:${vout} is being spent by ${spendStatus.txid}`);
              hasConflicts = true;
              conflictDetails.push({
                utxo: `${txid}:${vout}`,
                conflictingTx: spendStatus.txid
              });

              // Get info about conflicting transaction
              try {
                const conflictResponse = await fetch(`${baseUrl}/tx/${spendStatus.txid}`);
                if (conflictResponse.ok) {
                  const conflictTx = await conflictResponse.json();
                  console.log(`  💡 Conflicting transaction details:`, {
                    status: conflictTx.status?.confirmed ? 'confirmed' : 'unconfirmed',
                    size: conflictTx.size,
                    fee: conflictTx.fee,
                    firstSeen: conflictTx.status?.first_seen
                  });
                }
              } catch (conflictError) {
                console.log(`  ⚠️ Could not get conflict details: ${conflictError.message}`);
              }
            }
          } else {
            console.log(`✅ UTXO ${txid}:${vout} is unspent and available`);
          }
        } else {
          console.log(`⚠️ Could not fetch UTXO status: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️ UTXO ${txid}:${vout} check failed: ${error.message}`);
      }
    }

    if (hasConflicts) {
      const conflictMessage = conflictDetails.map(c => 
        `UTXO ${c.utxo} is being spent by ${c.conflictingTx}`
      ).join(', ');
      
      throw new AppError(
        `Transaction conflicts detected: ${conflictMessage}. ` +
        `Wait for conflicting transactions to confirm or be removed from mempool.`,
        400
      );
    }

    // 3. Check if UTXOs exist and are confirmed
    console.log('3. Verifying UTXO existence and confirmation...');
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.txInputs[i];
      const txid = input.hash.reverse().toString('hex');
      
      try {
        const txResponse = await fetch(`${baseUrl}/tx/${txid}`);
        if (!txResponse.ok) {
          console.log(`❌ UTXO transaction ${txid} does not exist or is not found!`);
          throw new AppError(
            `UTXO transaction ${txid} does not exist on the blockchain. ` +
            `Make sure you are on the correct network (${network}).`,
            400
          );
        } else {
          const txData = await txResponse.json();
          console.log(`✅ UTXO ${txid} exists, status:`, {
            confirmed: txData.status?.confirmed || false,
            confirmations: txData.confirmations || 0,
            blockHeight: txData.status?.block_height || 'unconfirmed'
          });
          
          if (!txData.status?.confirmed) {
            console.log(`⚠️ WARNING: UTXO ${txid} is unconfirmed`);
          }
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.log(`⚠️ UTXO existence check failed: ${error.message}`);
      }
    }

    console.log('✅ All pre-broadcast checks passed!');

    // 🚀 BROADCAST TRANSACTION
    console.log('\n🚀 BROADCASTING TRANSACTION...');
    console.log('🌐 Broadcasting to:', baseUrl);
    console.log('📤 Sending transaction hex...');

    const response = await fetch(`${baseUrl}/tx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: txHex
    });

    console.log('📡 Broadcast response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BROADCAST FAILED!');
      console.error('📋 Error response:', errorText);
      
      // Enhanced error parsing with specific solutions
      let errorMessage = 'Broadcast failed';
      let userFriendlyMessage = 'Transaction broadcast failed';
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = `Broadcast failed: ${errorJson.message}`;
          
          // Common error explanations and solutions
          if (errorJson.message.includes('bad-txns-inputs-missingorspent')) {
            userFriendlyMessage = 'The UTXOs you are trying to spend do not exist or have already been spent.';
            console.log('💡 SOLUTION: Generate a new PSBT with fresh UTXOs');
          } else if (errorJson.message.includes('insufficient fee')) {
            userFriendlyMessage = 'The transaction fee is too low.';
            console.log('💡 SOLUTION: Use a higher fee rate when generating the PSBT');
          } else if (errorJson.message.includes('non-mandatory-script-verify-flag')) {
            userFriendlyMessage = 'There is an issue with the transaction script or signatures.';
            console.log('💡 SOLUTION: Check the PSBT construction and regenerate if needed');
          } else if (errorJson.message.includes('txn-mempool-conflict')) {
            userFriendlyMessage = 'This transaction conflicts with another transaction in the mempool.';
            console.log('💡 SOLUTION: Wait for the conflicting transaction to clear');
          } else if (errorJson.message.includes('already in block chain')) {
            userFriendlyMessage = 'This transaction is already confirmed on the blockchain.';
            console.log('💡 SOLUTION: The transaction was already successful!');
          }
        }
      } catch (e) {
        errorMessage = `Broadcast failed: ${errorText}`;
      }
      
      throw new AppError(`${userFriendlyMessage} (${errorMessage})`, 500);
    }

    const broadcastResult = await response.text();
    console.log('✅ BROADCAST SUCCESSFUL!');
    console.log('📋 Broadcast result:', broadcastResult);

    const explorerUrl = network === 'testnet'
      ? `https://mempool.space/testnet/tx/${txId}`
      : `https://mempool.space/tx/${txId}`;

    console.log('🔗 Explorer URL:', explorerUrl);

    res.json({
      success: true,
      message: 'Transaction broadcast successfully!',
      data: {
        txid: txId,
        tx_hex: txHex,
        explorer_url: explorerUrl,
        network: network,
        size: txHex.length / 2,
        inputs: psbt.inputCount,
        outputs: psbt.txOutputs.length,
        confirmation_link: explorerUrl
      }
    });

  } catch (error) {
    console.error('\n❌ FINAL BROADCAST ERROR:');
    console.error('📋 Error message:', error.message);
    console.error('📋 Error type:', error.constructor.name);
    
    if (txId) {
      console.error('📋 Transaction ID:', txId);
    }
    
    // Enhanced troubleshooting based on error type
    if (error.message.includes('bad-txns-inputs-missingorspent')) {
      console.error('\n💡 TROUBLESHOOTING - UTXO ISSUES:');
      console.error('  1. Check if the UTXOs exist on the correct network');
      console.error('  2. Verify no other transaction spent the same UTXOs');
      console.error('  3. Generate a new PSBT with fresh UTXOs');
      console.error('  4. Ensure wallet has sufficient balance');
      console.error('  5. Wait for previous transactions to confirm');
    } else if (error.message.includes('already exists')) {
      console.error('\n💡 TROUBLESHOOTING - DUPLICATE TRANSACTION:');
      console.error('  1. Check mempool for the transaction status');
      console.error('  2. Wait for confirmation if already broadcast');
      console.error('  3. If confirmed, the trade was successful!');
      console.error('  4. Generate new listing if needed');
    } else if (error.message.includes('conflict')) {
      console.error('\n💡 TROUBLESHOOTING - TRANSACTION CONFLICTS:');
      console.error('  1. Wait for conflicting transactions to clear from mempool');
      console.error('  2. Use fresh UTXOs that are not involved in other transactions');
      console.error('  3. Check wallet for pending transactions');
    }
    
    console.error('📋 Full error stack:', error.stack);
    
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

const checkTransactionStatus = async (txId, network = 'testnet') => {
  try {
    const baseUrl = network === 'testnet' 
      ? 'https://mempool.space/testnet/api' 
      : 'https://mempool.space/api';
    
    console.log(`🔍 Checking transaction status: ${txId}`);
    
    const response = await fetch(`${baseUrl}/tx/${txId}`);
    if (response.ok) {
      const txData = await response.json();
      console.log('✅ TRANSACTION EXISTS ON NETWORK!');
      console.log('📊 Transaction details:', {
        confirmed: txData.status?.confirmed || false,
        confirmations: txData.confirmations || 0,
        size: txData.size,
        fee: txData.fee,
        firstSeen: txData.status?.first_seen
      });
      
      if (txData.status?.confirmed) {
        console.log('🎉 TRANSACTION IS CONFIRMED ON BLOCKCHAIN!');
        return { exists: true, confirmed: true };
      } else {
        console.log('⏳ Transaction is in mempool (unconfirmed)');
        return { exists: true, confirmed: false };
      }
    } else {
      console.log('❌ Transaction not found in network');
      return { exists: false, confirmed: false };
    }
  } catch (error) {
    console.error('Error checking transaction:', error);
    return { exists: false, confirmed: false };
  }
};

// Call this with your transaction ID
await checkTransactionStatus('d1d57974b75e08c332b8974128ad531fd3711721c8558267eb18c3131198b957', 'testnet');
// Add this debug function to check UTXO status
const checkUTXOStatus = async (txid, vout, network = 'testnet') => {
  try {
    const baseUrl = network === 'testnet' 
      ? 'https://mempool.space/testnet/api' 
      : 'https://mempool.space/api';
    
    console.log(`🔍 Checking UTXO: ${txid}:${vout}`);
    
    const response = await fetch(`${baseUrl}/tx/${txid}/outspend/${vout}`);
    if (response.ok) {
      const spendStatus = await response.json();
      console.log('📊 UTXO Status:', {
        spent: spendStatus.spent,
        spendingTx: spendStatus.txid || 'none',
        spendingIndex: spendStatus.vout || 'none'
      });
      
      if (spendStatus.spent) {
        console.log(`❌ UTXO is already spent by: ${spendStatus.txid}`);
        
        // Check the spending transaction
        const spendingTxResponse = await fetch(`${baseUrl}/tx/${spendStatus.txid}`);
        if (spendingTxResponse.ok) {
          const spendingTx = await spendingTxResponse.json();
          console.log('📋 Spending transaction:', {
            confirmed: spendingTx.status?.confirmed || false,
            firstSeen: spendingTx.status?.first_seen
          });
        }
      } else {
        console.log('✅ UTXO is available');
      }
    } else {
      console.log('❌ Could not fetch UTXO status');
    }
  } catch (error) {
    console.error('Error checking UTXO:', error);
  }
};

// Check your payment UTXO
await checkUTXOStatus('8288e26e5cf7398bf80970b0f8b8436fb4aad942c3dc598191732f886fbb7c0b', 1, 'testnet');

// Check the seller's UTXO status
const checkSellerUTXO = async () => {
  try {
    // The seller's UTXO from your PSBT: 3578b874fb0e0f9fba1d01121c1bc1adb2ff01703d90491e0957f65fcdcdf37e:0
    const sellerTxid = '3578b874fb0e0f9fba1d01121c1bc1adb2ff01703d90491e0957f65fcdcdf37e';
    const sellerVout = 0;
    
    console.log(`🔍 Checking SELLER UTXO: ${sellerTxid}:${sellerVout}`);
    
    const baseUrl = 'https://mempool.space/testnet/api';
    const response = await fetch(`${baseUrl}/tx/${sellerTxid}/outspend/${sellerVout}`);
    
    if (response.ok) {
      const spendStatus = await response.json();
      console.log('📊 SELLER UTXO Status:', {
        spent: spendStatus.spent,
        spendingTx: spendStatus.txid || 'none',
        spendingIndex: spendStatus.vout || 'none'
      });
      
      if (spendStatus.spent) {
        console.log(`❌ SELLER UTXO is already spent by: ${spendStatus.txid}`);
        return false;
      } else {
        console.log('✅ SELLER UTXO is available');
        return true;
      }
    } else {
      console.log('❌ Could not fetch SELLER UTXO status');
      return false;
    }
  } catch (error) {
    console.error('Error checking seller UTXO:', error);
    return false;
  }
};

await checkSellerUTXO();
const debugPSBTCompletely = async (psbtBase64, network = 'testnet') => {
  const { network: networkConfig } = getNetworkConfig(network);
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: networkConfig });
  
  console.log('\n🔍 COMPREHENSIVE PSBT ANALYSIS:');
  console.log('================================');
  
  // Basic info
  console.log(`📊 PSBT Version: ${psbt.version}`);
  console.log(`🔢 Input Count: ${psbt.inputCount}`);
  console.log(`📤 Output Count: ${psbt.txOutputs.length}`);
  console.log(`⏰ Locktime: ${psbt.locktime}`);
  
  // Input analysis
  console.log('\n📋 INPUT ANALYSIS:');
  for (let i = 0; i < psbt.inputCount; i++) {
    const input = psbt.txInputs[i];
    const inputData = psbt.data.inputs[i];
    
    const txid = input.hash.reverse().toString('hex');
    console.log(`\n  Input ${i}: ${txid}:${input.index}`);
    console.log(`    Sequence: ${input.sequence}`);
    
    // Signature analysis
    console.log(`    Signatures:`);
    console.log(`      - TapKeySig: ${inputData.tapKeySig ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`      - PartialSig: ${inputData.partialSig ? `✅ ${inputData.partialSig.length} signatures` : '❌ MISSING'}`);
    console.log(`      - TapScriptSig: ${inputData.tapScriptSig ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`      - SighashType: ${inputData.sighashType}`);
    
    // UTXO data
    console.log(`    UTXO Data:`);
    console.log(`      - WitnessUtxo: ${inputData.witnessUtxo ? `✅ ${inputData.witnessUtxo.value} sats` : '❌ MISSING'}`);
    console.log(`      - NonWitnessUtxo: ${inputData.nonWitnessUtxo ? '✅ PRESENT' : '❌ MISSING'}`);
    
    // Finalization status
    console.log(`    Finalization:`);
    console.log(`      - FinalScriptSig: ${inputData.finalScriptSig ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`      - FinalScriptWitness: ${inputData.finalScriptWitness ? '✅ PRESENT' : '❌ MISSING'}`);
    
    // Try to validate this specific input
    try {
      psbt.validateSignaturesOfInput(i);
      console.log(`    ✅ Signature Validation: PASSED`);
    } catch (e) {
      console.log(`    ❌ Signature Validation: FAILED - ${e.message}`);
    }
  }
  
  // Output analysis
  console.log('\n📤 OUTPUT ANALYSIS:');
  psbt.txOutputs.forEach((output, i) => {
    try {
      const address = bitcoin.address.fromOutputScript(output.script, networkConfig);
      console.log(`  Output ${i}: ${address} - ${output.value} sats`);
    } catch (e) {
      console.log(`  Output ${i}: Unknown script - ${output.value} sats`);
    }
  });
  
  // Try finalization
  console.log('\n🔧 FINALIZATION TEST:');
  const testPsbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: networkConfig });
  for (let i = 0; i < testPsbt.inputCount; i++) {
    try {
      testPsbt.finalizeInput(i);
      console.log(`  ✅ Input ${i} finalization: SUCCESS`);
    } catch (e) {
      console.log(`  ❌ Input ${i} finalization: FAILED - ${e.message}`);
    }
  }
  
  // Try extraction
  console.log('\n📄 EXTRACTION TEST:');
  try {
    const tx = testPsbt.extractTransaction();
    console.log(`  ✅ Extraction: SUCCESS`);
    console.log(`  📄 TXID: ${tx.getId()}`);
    console.log(`  📄 Size: ${tx.toHex().length / 2} bytes`);
  } catch (e) {
    console.log(`  ❌ Extraction: FAILED - ${e.message}`);
  }
};

// Run this with your PSBT
await debugPSBTCompletely(your_psbt_base64, 'testnet');
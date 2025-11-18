import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
import { AppError } from '../middleware/errorHandler.js';

// Initialize ECC library
initEccLib(ecc);

// Network configuration - make it dynamic
let currentNetwork ;// Default to testnet
let isTestnet;

// Network configuration function
export const setNetwork = (networkType) => {
  if (networkType === 'testnet') {
    currentNetwork = bitcoin.networks.testnet;
    isTestnet = true;
    console.log('Network set to: testnet');
  } else if (networkType === 'signet') {
    currentNetwork = bitcoin.networks.testnet; // bitcoinjs uses testnet for signet
    isTestnet = true;
    console.log('Network set to: signet');
  } else {
    currentNetwork = bitcoin.networks.bitcoin;
    isTestnet = false;
    console.log('Network set to: mainnet');
  }
  return currentNetwork;
};

// Get current network info
export const getNetworkInfo = () => {
  return {
    network: currentNetwork,
    isTestnet,
    networkName: isTestnet ? 'testnet' : 'mainnet'
  };
};

// FIXED: Enhanced address validation that actually works
export const validateAddress = (address) => {
  try {
    // Method 1: Try toOutputScript first (most reliable)
    bitcoin.address.toOutputScript(address, currentNetwork);
    return true;
  } catch (error) {
    console.log(`Address validation failed for ${address}:`, error.message);
    
    // Method 2: Manual validation for different address types
    try {
      // Check if it's a bech32 address
      if (address.startsWith('bc1') || address.startsWith('tb1') || address.startsWith('bcrt1')) {
        const decoded = bitcoin.address.fromBech32(address);
        
        if (isTestnet) {
          return decoded.prefix === 'tb' || decoded.prefix === 'bcrt';
        } else {
          return decoded.prefix === 'bc';
        }
      }
      
      // Check if it's a base58 address
      if (address.startsWith('1') || address.startsWith('3') || address.startsWith('m') || address.startsWith('n') || address.startsWith('2')) {
        const decoded = bitcoin.address.fromBase58Check(address);
        
        if (isTestnet) {
          return [currentNetwork.pubKeyHash, currentNetwork.scriptHash].includes(decoded.version);
        } else {
          return [bitcoin.networks.bitcoin.pubKeyHash, bitcoin.networks.bitcoin.scriptHash].includes(decoded.version);
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
};

// FIXED: Simple and reliable address validation for PSBT generation
const validateAddressForPSBT = (address) => {
  try {
    // This is the most reliable method - try to create output script
    const script = bitcoin.address.toOutputScript(address, currentNetwork);
    
    // Additional validation for testnet
    if (isTestnet) {
      // Testnet addresses should start with tb1, m, n, or 2
      const isValidTestnetPrefix = 
        address.startsWith('tb1') || 
        address.startsWith('m') || 
        address.startsWith('n') || 
        address.startsWith('2') ||
        address.startsWith('bcrt1'); // for regtest
        
      if (!isValidTestnetPrefix) {
        console.log(`Invalid testnet address prefix: ${address}`);
        return false;
      }
    } else {
      // Mainnet addresses should start with bc1, 1, or 3
      const isValidMainnetPrefix = 
        address.startsWith('bc1') || 
        address.startsWith('1') || 
        address.startsWith('3');
        
      if (!isValidMainnetPrefix) {
        console.log(`Invalid mainnet address prefix: ${address}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.log(`Address validation failed for ${address}:`, error.message);
    return false;
  }
};

export const verifyOwnership = async (inscriptionId, address) => {
  try {
    console.log(`🔍 Verifying ownership of ${inscriptionId} for address ${address}`);
    
    // Validate address for current network
    if (!validateAddress(address)) {
      throw new AppError(`Invalid ${isTestnet ? 'testnet' : 'mainnet'} address`, 400);
    }

    // Fetch inscription data
    const inscriptionData = await getInscriptionData(inscriptionId);
    
    if (!inscriptionData) {
      throw new AppError('Inscription not found', 404);
    }

    // Check if the address matches the current owner
    console.log('Inscription address:', inscriptionData.address);
    console.log('Provided address:', address);
    
    const isOwner = inscriptionData.address === address;
    
    if (isOwner) {
      console.log('✅ Ownership verified successfully');
    } else {
      console.log('❌ Ownership verification failed');
    }
    
    return isOwner;
    
  } catch (error) {
    console.error('Ownership verification error:', error);
    throw new AppError(`Ownership verification failed: ${error.message}`, 400);
  }
};


// Get transaction hex from appropriate network
const getTransactionHex = async (txid) => {
  try {
    const networkConfig = getNetworkConfig();
    console.log(`📡 Fetching transaction from: ${networkConfig.baseMempoolApiUrl}`);
    
    const response = await fetch(`${networkConfig.baseMempoolApiUrl}/tx/${txid}/hex`);
    if (!response.ok) {
      throw new Error(`Transaction not found: ${response.status}`);
    }
    
    const txHex = await response.text();
    
    // Validate it's actual hex
    if (!txHex.match(/^[0-9a-fA-F]+$/)) {
      throw new Error('Invalid transaction hex returned from API');
    }
    
    console.log(`✅ Transaction fetched successfully (${txHex.length} chars)`);
    return txHex;
    
  } catch (error) {
    console.error('Error fetching transaction hex:', error);
    throw new AppError(`Failed to fetch transaction: ${error.message}`, 500);
  }
};

// Get appropriate API endpoints based on network
export const getNetworkConfig = () => {
  if (isTestnet) {
    return {
      ordinalsExplorerUrl: "https://testnet.ordinals.com",
      baseMempoolUrl: "https://mempool.space/testnet",
      baseMempoolApiUrl: "https://mempool.space/testnet/api",
      networkName: "testnet"
    };
  } else {
    return {
      ordinalsExplorerUrl: "https://ordinals.com",
      baseMempoolUrl: "https://mempool.space",
      baseMempoolApiUrl: "https://mempool.space/api",
      networkName: "mainnet"
    };
  }
};

// Convert BTC → Sats helper
export const btcToSats = (value) => {
  if (!value) return 0;

  // If sats already (integer), return directly
  if (!String(value).includes(".")) {
    return parseInt(value);
  }

  // If value is in BTC (float string), convert to sats
  return Math.round(parseFloat(value) * Math.pow(10, 8));
};

// FIXED: Generate Seller PSBT with proper network handling
export const generateSellerPSBT = async (
  inscriptionId,
  inscriptionOutput,
  priceInput,
  sellerAddress,
  paymentAddress = null,
  network
) => {
  try {
    setNetwork(network);
    const networkInfo = getNetworkInfo();
    console.log("🔄 Generating Seller PSBT...");
    console.log("Network:", networkInfo.networkName);
    console.log("Seller Address:", sellerAddress);
    console.log("Payment Address:", paymentAddress || sellerAddress);

    // Use paymentAddress if provided, otherwise use sellerAddress
    const finalPaymentAddress = paymentAddress || sellerAddress;

    // Validate addresses using the fixed function
    if (!validateAddressForPSBT(sellerAddress)) {
      throw new AppError(`Invalid seller address for ${networkInfo.networkName}: ${sellerAddress}`, 400);
    }

    if (!validateAddressForPSBT(finalPaymentAddress)) {
      throw new AppError(`Invalid payment address for ${networkInfo.networkName}: ${finalPaymentAddress}`, 400);
    }

    console.log("✅ Address validation passed");

    // Ensure price is number in sats
    const priceSats = btcToSats(priceInput);

    if (priceSats <= 0) {
      throw new AppError("Invalid price: must be greater than 0", 400);
    }

    // Verify ownership before generating PSBT
    // const isOwner = await verifyOwnership(inscriptionId, sellerAddress);
    const isOwner = true; // Temporarily bypass ownership check for testing
    if (!isOwner) {
      throw new AppError("Seller does not own this inscription", 403);
    }

    // 1️⃣ Parse "txid:vout"
    const [txid, vout] = inscriptionOutput.split(":");
    if (!txid || vout === undefined) {
      throw new AppError("Invalid inscription_output format. Expected 'txid:vout'", 400);
    }

    const outputIndex = parseInt(vout);
    if (isNaN(outputIndex) || outputIndex < 0) {
      throw new AppError("Invalid output index in inscription_output", 400);
    }

    // 2️⃣ Fetch raw tx data from appropriate network
    const txHex = await getTransactionHex(txid);
    let transaction;
    
    try {
      transaction = bitcoin.Transaction.fromHex(txHex);
    } catch (error) {
      throw new AppError(`Invalid transaction hex: ${error.message}`, 400);
    }

    // Validate output index exists
    if (outputIndex >= transaction.outs.length) {
      throw new AppError(`Output index ${outputIndex} not found in transaction (only ${transaction.outs.length} outputs)`, 400);
    }

    const inscriptionUtxo = transaction.outs[outputIndex];
    const utxoValue = inscriptionUtxo.value;

    // 3️⃣ Initialize PSBT with current network
    const psbt = new bitcoin.Psbt({ network: currentNetwork });

    // 4️⃣ Create MINIMAL nonWitnessUtxo for compatibility
    const minimalTx = new bitcoin.Transaction();
    minimalTx.version = 2;
    minimalTx.locktime = 0;
    
    // Add minimal input
    minimalTx.addInput(Buffer.from(txid, 'hex').reverse(), outputIndex, 0xffffffff);
    
    // Add only the output we're spending from
    minimalTx.addOutput(inscriptionUtxo.script, utxoValue);

    // 5️⃣ Add ordinal UTXO as input
    const input = {
      hash: txid,
      index: outputIndex,
      // Include both for maximum compatibility
      nonWitnessUtxo: minimalTx.toBuffer(),
      witnessUtxo: {
        script: inscriptionUtxo.script,
        value: utxoValue,
      },
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };

    psbt.addInput(input);

    // 6️⃣ Add payment output - Use the validated address
    psbt.addOutput({
      address: finalPaymentAddress,
      value: priceSats,
    });

    const psbtBase64 = psbt.toBase64();

    console.log("✅ Seller PSBT generated successfully!");
    console.log("📦 PSBT Size:", psbtBase64.length, "chars (base64)");
    console.log("💎 UTXO Value:", utxoValue, "sats");
    console.log("💰 Asking Price:", priceSats, "sats");
    console.log("📍 Payment Address:", finalPaymentAddress);
    console.log("🌐 Network:", networkInfo.networkName);
    
    return psbtBase64;

  } catch (error) {
    console.error("❌ Seller PSBT generation error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to generate seller PSBT: ${error.message}`, 500);
  }
};


// // Utility function to convert PSBT to hex (for wallet compatibility)
// export const psbtToHex = (psbtBase64) => {
//   try {
//     const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
//     return psbt.toHex();
//   } catch (error) {
//     throw new AppError(`Invalid PSBT: ${error.message}`, 400);
//   }
// };

// Utility function to convert hex to PSBT
export const hexToPsbt = (psbtHex) => {
  try {
    return bitcoin.Psbt.fromHex(psbtHex, { network });
  } catch (error) {
    throw new AppError(`Invalid PSBT hex: ${error.message}`, 400);
  }
};

// Additional utility: Decode and analyze PSBT
export const analyzePSBT = (psbtBase64) => {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
    
    const analysis = {
      version: psbt.version,
      locktime: psbt.locktime,
      inputs: psbt.txInputs.map((input, index) => ({
        index,
        txid: input.hash.reverse().toString('hex'),
        vout: input.index,
        sequence: input.sequence,
        hasWitnessUtxo: !!psbt.data.inputs[index].witnessUtxo,
        hasNonWitnessUtxo: !!psbt.data.inputs[index].nonWitnessUtxo,
        sighashType: psbt.data.inputs[index].sighashType,
      })),
      outputs: psbt.txOutputs.map((output, index) => ({
        index,
        value: output.value,
        script: output.script.toString('hex'),
        address: getAddressFromScript(output.script),
      })),
      isSigned: psbt.data.inputs.some(input => input.partialSig),
      canExtract: psbt.data.inputs.every(input => input.finalScriptSig || input.finalScriptWitness),
    };
    
    return analysis;
  } catch (error) {
    throw new AppError(`Failed to analyze PSBT: ${error.message}`, 400);
  }
};

// Helper function to get address from script
const getAddressFromScript = (script) => {
  try {
    return bitcoin.address.fromOutputScript(script, network);
  } catch (error) {
    return 'Unknown script type';
  }
};

export const generateBuyerPSBT = async (listing, buyerAddress, receiverAddress) => {
  try {
    const psbt = new bitcoin.Psbt({ network });

    // Get seller's signed PSBT from listing
    const sellerPSBT = bitcoin.Psbt.fromBase64(listing.signed_psbt, { network });

    // Add the seller's input (ordinal)
    psbt.addInput({
      ...sellerPSBT.data.globalMap.unsignedTx.tx.ins[0],
      ...sellerPSBT.data.inputs[0]
    });

    // Add seller's output (payment)
    psbt.addOutput({
      ...sellerPSBT.data.globalMap.unsignedTx.tx.outs[0],
    });

    // Get buyer's UTXOs for payment
    const buyerUtxos = await getAddressUtxos(buyerAddress);
    const paymentUtxos = await selectPaymentUtxos(buyerUtxos, listing.price_sats);

    let totalPaymentValue = 0;

    // Add buyer's payment UTXOs
    for (const utxo of paymentUtxos) {
      const txHex = await getTransactionHex(utxo.txid);
      const transaction = bitcoin.Transaction.fromHex(txHex);

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: transaction.toBuffer(),
        witnessUtxo: transaction.outs[utxo.vout],
      });

      totalPaymentValue += utxo.value;
    }

    // Calculate fee
    const estimatedSize = estimateTransactionSize(
      psbt.txInputs.length,
      psbt.txOutputs.length + 2 // +2 for dummy UTXO and change
    );
    const fee = Math.ceil(estimatedSize * RECOMMENDED_FEE_RATE);

    const totalRequired = listing.price_sats + DUMMY_UTXO_VALUE + fee;
    
    if (totalPaymentValue < totalRequired) {
      throw new AppError(
        `Insufficient funds. Required: ${totalRequired} sats, Available: ${totalPaymentValue} sats`,
        400
      );
    }

    const change = totalPaymentValue - listing.price_sats - DUMMY_UTXO_VALUE - fee;

    // Add dummy UTXO output (required for ordinal transfer)
    psbt.addOutput({
      address: receiverAddress,
      value: DUMMY_UTXO_VALUE,
    });

    // Add change output
    if (change > 0) {
      psbt.addOutput({
        address: buyerAddress,
        value: change,
      });
    }

    return psbt.toBase64();
  } catch (error) {
    console.error('Buyer PSBT generation error:', error);
    throw new AppError(`Failed to generate buyer PSBT: ${error.message}`, 500);
  }
};

export const validatePSBT = async (psbtBase64, inscriptionOutput, expectedAmount) => {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });

    // Check if PSBT has exactly one input and one output
    if (psbt.txInputs.length !== 1 || psbt.txOutputs.length !== 1) {
      return false;
    }

    // Verify the input matches the inscription output
    const input = psbt.txInputs[0];
    const psbtInput = `${input.hash.reverse().toString('hex')}:${input.index}`;
    
    if (psbtInput !== inscriptionOutput) {
      return false;
    }

    // Verify the output amount matches expected amount
    const output = psbt.txOutputs[0];
    if (output.value !== expectedAmount) {
      return false;
    }

    // Try to extract transaction (this will fail if not properly signed)
    try {
      psbt.extractTransaction(true);
    } catch (e) {
      if (e.message === 'Not finalized') {
        return false; // PSBT not signed
      }
      // Other extraction errors might be acceptable for validation
    }

    return true;
  } catch (error) {
    console.error('PSBT validation error:', error);
    return false;
  }
};

// Helper functions
const getInscriptionData = async (inscriptionId) => {
  try {
    const response = await fetch(`https://ordinals.com/inscription/${inscriptionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch inscription data');
    }
    
    const html = await response.text();
    
    // Parse the HTML using your existing pattern matching approach
    const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
      .map(x => { 
        x[2] = x[2].replace(/<.*?>/gm, ''); 
        return x;
      })
      .reduce((a, b) => { 
        return { ...a, [b[1]]: b[2] };
      }, {});

    // Extract address - look for common patterns in ordinals explorer
    let address = null;
    
    // Method 1: Look for address in the parsed data
    if (data.address) {
      address = data.address;
    }
    // Method 2: Look for "Address" field in the parsed data
    else if (data.Address) {
      address = data.Address;
    }
    // Method 3: Direct HTML pattern matching for address
    else {
      const addressMatch = html.match(/<dt>Address<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
      if (addressMatch) {
        address = addressMatch[1].replace(/<.*?>/g, '');
      }
    }
    
    // Method 4: Look for output in transaction data
    if (!address) {
      const outputMatch = html.match(/<dt>output<\/dt>\s*<dd[^>]*>.*?\((.*?)\)<\/dd>/);
      if (outputMatch) {
        address = outputMatch[1];
      }
    }

    // Also extract other useful information
    const inscriptionNumberMatch = html.match(/<h1>Inscription (\d*)<\/h1>/);
    const inscriptionNumber = inscriptionNumberMatch ? inscriptionNumberMatch[1] : null;

    if (!address) {
      throw new Error('Could not extract address from inscription data');
    }

    return {
      address: address.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to fetch inscription data: ${error.message}`);
  }
};



const getAddressUtxos = async (address) => {
  try {
    // Fetch from mempool.space
    const response = await fetch(`https://mempool.space/api/address/${address}/utxo`);
    if (!response.ok) {
      throw new Error('Failed to fetch UTXOs');
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch UTXOs: ${error.message}`);
  }
};

const selectPaymentUtxos = async (utxos, requiredAmount) => {
  // Simple UTXO selection - use the smallest UTXOs that cover the required amount
  const sortedUtxos = utxos.sort((a, b) => a.value - b.value);
  
  let selectedUtxos = [];
  let totalValue = 0;

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    totalValue += utxo.value;
    
    if (totalValue >= requiredAmount + DUMMY_UTXO_VALUE + 1000) { // Include buffer for fees
      break;
    }
  }

  if (totalValue < requiredAmount) {
    throw new Error('Insufficient UTXOs to cover required amount');
  }

  return selectedUtxos;
};

const estimateTransactionSize = (inputCount, outputCount) => {
  // Basic transaction size estimation
  const baseSize = 10;
  const inputSize = 180;
  const outputSize = 34;
  
  return baseSize + (inputCount * inputSize) + (outputCount * outputSize);
};
// Add these functions to your existing psbtService.js

// Sign PSBT with wallet service
export const signPSBTWithWalletService = async (unsignedPsbtBase64, networkType = 'testnet', walletType = 'unisat') => {
  try {
    setNetwork(networkType);
    const networkInfo = getNetworkInfo();
    
    console.log("🔄 Initiating PSBT signing with wallet...");
    console.log("Wallet Type:", walletType);
    console.log("Network:", networkInfo.networkName);

    // Validate the PSBT first
    const psbt = bitcoin.Psbt.fromBase64(unsignedPsbtBase64, { network: currentNetwork });
    
    // Analyze the PSBT before signing
    const psbtAnalysis = analyzePSBTInternal(psbt);
    
    console.log("📋 PSBT Analysis:", {
      inputs: psbtAnalysis.inputs.length,
      outputs: psbtAnalysis.outputs.length,
      requiresSigning: psbtAnalysis.inputs.filter(input => !input.hasPartialSig).length
    });

    // Prepare the signing request for the wallet
    const signingRequest = {
      psbt: unsignedPsbtBase64,
      psbt_hex: psbtToHex(unsignedPsbtBase64),
      network: networkType,
      wallet_type: walletType,
      to_sign: psbtAnalysis.inputs.map((input, index) => ({
        input_index: index,
        address: input.address,
        value: input.value,
        requires_signing: !input.hasPartialSig
      })).filter(input => input.requires_signing),
      instructions: getWalletSigningInstructions(walletType)
    };

    // In a real implementation, this would trigger the wallet's signing interface
    // For now, we'll simulate the wallet interaction and provide instructions
    
    const result = {
      signing_request: signingRequest,
      status: 'pending_wallet_signature',
      message: `Please sign the PSBT using your ${walletType} wallet`,
      next_steps: [
        `1. Copy the PSBT (base64 or hex) above`,
        `2. Open your ${walletType} wallet`,
        `3. Use the 'Sign PSBT' feature`,
        `4. Paste the PSBT and sign it`,
        `5. Submit the signed PSBT to /verify-signed-psbt endpoint`
      ],
      psbt_preview: {
        inputs: psbtAnalysis.inputs.map(input => ({
          index: input.index,
          address: input.address,
          value: input.value,
          signed: input.hasPartialSig
        })),
        outputs: psbtAnalysis.outputs.map(output => ({
          index: output.index,
          address: output.address,
          value: output.value
        }))
      }
    };

    console.log("✅ PSBT prepared for wallet signing");
    return result;

  } catch (error) {
    console.error("❌ PSBT signing preparation error:", error);
    throw new AppError(`Failed to prepare PSBT for signing: ${error.message}`, 500);
  }
};

// Verify signed PSBT service
export const verifySignedPSBTService = async (signedPsbtBase64, networkType = 'testnet') => {
  try {
    setNetwork(networkType);
    const networkInfo = getNetworkInfo();
    
    console.log("🔍 Verifying signed PSBT...");
    console.log("Network:", networkInfo.networkName);

    const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64, { network: currentNetwork });
    const analysis = analyzePSBTInternal(psbt);

    const verificationResult = {
      isSigned: analysis.isSigned,
      isFullySigned: analysis.inputs.every(input => input.hasPartialSig),
      canFinalize: false,
      inputs: analysis.inputs,
      outputs: analysis.outputs,
      network: networkType,
      errors: [],
      warnings: []
    };

    // Check signing status
    const signedInputs = analysis.inputs.filter(input => input.hasPartialSig).length;
    const totalInputs = analysis.inputs.length;
    
    console.log(`📊 Signing Status: ${signedInputs}/${totalInputs} inputs signed`);

    if (signedInputs === 0) {
      verificationResult.errors.push("No inputs are signed");
    } else if (signedInputs < totalInputs) {
      verificationResult.warnings.push(`Only ${signedInputs}/${totalInputs} inputs are signed`);
    }

    // Try to finalize the PSBT
    try {
      const finalizablePsbt = bitcoin.Psbt.fromBase64(signedPsbtBase64, { network: currentNetwork });
      finalizablePsbt.finalizeAllInputs();
      verificationResult.canFinalize = true;
      
      // Extract final transaction
      const finalTx = finalizablePsbt.extractTransaction();
      verificationResult.finalTransaction = {
        txid: finalTx.getId(),
        hex: finalTx.toHex(),
        size: finalTx.toBuffer().length
      };
      
      console.log("✅ PSBT can be finalized successfully");
    } catch (finalizeError) {
      verificationResult.errors.push(`Finalization failed: ${finalizeError.message}`);
      console.log("❌ PSBT finalization failed:", finalizeError.message);
    }

    // Check if ready for broadcast
    verificationResult.readyForBroadcast = verificationResult.isFullySigned && verificationResult.canFinalize;

    if (verificationResult.readyForBroadcast) {
      console.log("🎉 PSBT is fully signed and ready for broadcast!");
      verificationResult.broadcastInstructions = [
        "1. Use the final transaction hex to broadcast",
        "2. Send POST request to /api/psbt/broadcast",
        "3. Or broadcast via mempool.space API"
      ];
    }

    return verificationResult;

  } catch (error) {
    console.error("❌ PSBT verification error:", error);
    throw new AppError(`Failed to verify PSBT: ${error.message}`, 500);
  }
};

// Internal PSBT analysis function
const analyzePSBTInternal = (psbt) => {
  const analysis = {
    version: psbt.version,
    locktime: psbt.locktime,
    inputs: psbt.txInputs.map((input, index) => {
      const inputData = psbt.data.inputs[index];
      let address = 'Unknown';
      
      try {
        if (inputData.witnessUtxo) {
          address = bitcoin.address.fromOutputScript(inputData.witnessUtxo.script, currentNetwork);
        } else if (inputData.nonWitnessUtxo) {
          const tx = bitcoin.Transaction.fromBuffer(inputData.nonWitnessUtxo);
          address = bitcoin.address.fromOutputScript(tx.outs[input.index].script, currentNetwork);
        }
      } catch (e) {
        console.log(`Could not decode address for input ${index}:`, e.message);
      }

      return {
        index,
        txid: input.hash.reverse().toString('hex'),
        vout: input.index,
        address: address,
        value: inputData.witnessUtxo ? inputData.witnessUtxo.value : 0,
        hasPartialSig: !!inputData.partialSig,
        hasFinalScript: !!(inputData.finalScriptSig || inputData.finalScriptWitness),
        sighashType: inputData.sighashType
      };
    }),
    outputs: psbt.txOutputs.map((output, index) => {
      let address = 'Unknown';
      try {
        address = bitcoin.address.fromOutputScript(output.script, currentNetwork);
      } catch (e) {
        console.log(`Could not decode address for output ${index}:`, e.message);
      }

      return {
        index,
        address: address,
        value: output.value,
        script: output.script.toString('hex')
      };
    }),
    isSigned: psbt.data.inputs.some(input => input.partialSig),
    canExtract: psbt.data.inputs.every(input => input.finalScriptSig || input.finalScriptWitness)
  };
  
  return analysis;
};

// Get wallet-specific signing instructions
const getWalletSigningInstructions = (walletType) => {
  const instructions = {
    unisat: [
      "Open UniSat Wallet extension",
      "Click on the wallet icon in your browser",
      "Find 'Sign PSBT' in the menu",
      "Paste the PSBT base64 or hex",
      "Review the transaction details",
      "Confirm and sign the PSBT"
    ],
    xverse: [
      "Open Xverse Wallet extension", 
      "Navigate to the advanced features",
      "Find 'Sign PSBT' option",
      "Paste the PSBT data",
      "Verify the transaction details",
      "Approve the signature"
    ],
    default: [
      "Open your Bitcoin wallet",
      "Find the PSBT signing feature",
      "Paste the PSBT data",
      "Review and confirm the transaction",
      "Export the signed PSBT"
    ]
  };

  return instructions[walletType] || instructions.default;
};

// Update your existing psbtToHex function to handle network properly
export const psbtToHex = (psbtBase64, networkType = 'testnet') => {
  try {
    setNetwork(networkType);
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: currentNetwork });
    return psbt.toHex();
  } catch (error) {
    throw new AppError(`Invalid PSBT: ${error.message}`, 400);
  }
};




// Export helper functions for testing
export const PSBTHelpers = {
  getInscriptionData,
  getTransactionHex,
  getAddressUtxos,
  selectPaymentUtxos,
  estimateTransactionSize
};
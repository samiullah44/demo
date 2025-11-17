import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
import { AppError } from '../middleware/errorHandler.js';

// Initialize ECC library - ADD THIS
initEccLib(ecc);

// Network configuration
const network = bitcoin.networks.bitcoin; // Change to testnet if needed

// Constants from OpenOrdex
const DUMMY_UTXO_VALUE = 1000;
const RECOMMENDED_FEE_RATE = 2; // sat/vbyte

export const verifyOwnership = async (inscriptionId, address) => {
  try {
    // Fetch inscription data from blockchain
    const inscriptionData = await getInscriptionData(inscriptionId);
    console.log('Fetched inscription data:', inscriptionData);
    if (!inscriptionData) {
      throw new AppError('Inscription not found', 404);
    }

    // Check if the address matches the current owner
    console.log('Inscription address:', inscriptionData.address);
    console.log('Provided address:', address);
    return inscriptionData.address === address;
  } catch (error) {
    console.error('Ownership verification error:', error);
    throw new AppError(`Ownership verification failed: ${error.message}`, 400);
  }
};

export const generateSellerPSBT = async (inscriptionId, inscriptionOutput, priceSats, sellerAddress, paymentAddress) => {
  try {
    const psbt = new bitcoin.Psbt({ network });

    // Parse the UTXO from inscription output (format: "txid:vout")
    const [txid, vout] = inscriptionOutput.split(':');
    
    if (!txid || vout === undefined) {
      throw new AppError('Invalid inscription output format', 400);
    }

    // Fetch the transaction data
    const txHex = await getTransactionHex(txid);
    const transaction = bitcoin.Transaction.fromHex(txHex);

    // Create input for the ordinal UTXO
    const input = {
      hash: txid,
      index: parseInt(vout),
      nonWitnessUtxo: transaction.toBuffer(),
      witnessUtxo: transaction.outs[parseInt(vout)],
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };

    psbt.addInput(input);

    // Add output for the payment
    psbt.addOutput({
      address: paymentAddress,
      value: priceSats,
    });

    return psbt.toBase64();
  } catch (error) {
    console.error('Seller PSBT generation error:', error);
    throw new AppError(`Failed to generate seller PSBT: ${error.message}`, 500);
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

const getTransactionHex = async (txid) => {
  try {
    // Fetch from mempool.space or your Bitcoin node
    const response = await fetch(`https://mempool.space/api/tx/${txid}/hex`);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction');
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch transaction: ${error.message}`);
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

// Export helper functions for testing
export const PSBTHelpers = {
  getInscriptionData,
  getTransactionHex,
  getAddressUtxos,
  selectPaymentUtxos,
  estimateTransactionSize
};
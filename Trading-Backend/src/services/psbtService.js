// ============================================================================
// COMPLETE PSBT SERVICE - Combined Implementation
// ============================================================================

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
import { AppError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

// Initialize ECC library
initEccLib(ecc);

// Network configuration - make it dynamic
let currentNetwork; // Default to testnet
let isTestnet=true;

// Constants from Claude's implementation
const DUMMY_UTXO_VALUE = 1000; // 1000 sats for dummy UTXO
const MIN_RELAY_FEE = 1; // Minimum relay fee rate (sats/vbyte)

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

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

const getNetworkConfig = (networkType = 'testnet') => {
  const isTestnet = networkType === 'testnet';
  
  return {
    isProduction: !isTestnet,
    ordinalsExplorerUrl: isTestnet ? "https://testnet.ordinals.com" : "https://ordinals.com",
    baseMempoolUrl: isTestnet ? "https://mempool.space/testnet" : "https://mempool.space",
    baseMempoolApiUrl: isTestnet ? "https://mempool.space/testnet/api" : "https://mempool.space/api",
    networkName: isTestnet ? "testnet" : "mainnet",
    bitcoinPriceApiUrl: "https://blockchain.info/ticker?cors=true",
    network: isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
  };
};

export const getBitcoinPrice = async () => {
  try {
    const response = await fetch("https://blockchain.info/ticker?cors=true");
    const data = await response.json();
    return data.USD.last;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    return 80000;
  }
};

// ============================================================================
// ADDRESS UTILITIES
// ============================================================================

export const getAddressType = (address, networkType = 'testnet') => {
  try {
    const { network } = getNetworkConfig(networkType);
    
    // Method 1: Try to decode as bech32 (Taproot or Native SegWit)
    if (address.startsWith('bc1') || address.startsWith('tb1') || address.startsWith('bcrt1')) {
      const decoded = bitcoin.address.fromBech32(address);
      
      // Check if it's Taproot (P2TR) - witness version 1
      if (decoded.version === 1) {
        return 'p2tr'; // Taproot
      }
      // Check if it's Native SegWit (P2WPKH) - witness version 0
      else if (decoded.version === 0) {
        return 'p2wpkh'; // Native SegWit
      }
    }
    
    // Method 2: Try to decode as base58
    try {
      const decoded = bitcoin.address.fromBase58Check(address);
      
      if (decoded.version === network.pubKeyHash) {
        return 'p2pkh'; // Legacy
      } else if (decoded.version === network.scriptHash) {
        return 'p2sh'; // Nested SegWit
      }
    } catch (e) {
      // Not a base58 address
    }
    
    return 'unknown';
  } catch (error) {
    console.log(`Address type detection failed for ${address}:`, error.message);
    return 'unknown';
  }
};

// ✅ NEW: Check if address is Taproot
export const isTaprootAddress = (address) => {
  return getAddressType(address) === 'p2tr';
};

// ✅ NEW: Check if address is Native SegWit
export const isNativeSegwitAddress = (address) => {
  return getAddressType(address) === 'p2wpkh';
};

export const validateOrdinalAddress = (address, networkType = 'testnet') => {
  const addressType = getAddressType(address, networkType);
  const { networkName } = getNetworkConfig(networkType);
  
  if (addressType !== 'p2tr') {
    throw new AppError(
      `Invalid address type for Ordinals. Expected Taproot (P2TR) but got ${addressType.toUpperCase()}. ` +
      `Ordinals can only be created, stored, and transferred using Taproot addresses (starting with ${networkType === 'testnet' ? 'tb1p' : 'bc1p'}).`,
      400
    );
  }
  
  // Additional format validation
  const expectedPrefix = networkType === 'testnet' ? 'tb1p' : 'bc1p';
  if (!address.startsWith(expectedPrefix)) {
    throw new AppError(
      `Invalid ${networkName} Taproot address format. Expected address starting with "${expectedPrefix}"`,
      400
    );
  }
  
  return true;
};

export const validateAddress = (address, requireTaproot = false) => {
  try {
    // Method 1: Try toOutputScript first (most reliable)
    const script = bitcoin.address.toOutputScript(address, currentNetwork);
    const addressType = getAddressType(address);
    
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
      
      // For testnet Taproot, should start with tb1p
      if (addressType === 'p2tr' && !address.startsWith('tb1p')) {
        console.log(`Invalid testnet Taproot address: ${address}`);
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
      
      // For mainnet Taproot, should start with bc1p
      if (addressType === 'p2tr' && !address.startsWith('bc1p')) {
        console.log(`Invalid mainnet Taproot address: ${address}`);
        return false;
      }
    }
    
    // If Taproot is required, validate it
    if (requireTaproot && addressType !== 'p2tr') {
      console.log(`Taproot address required but got: ${addressType}`);
      return false;
    }
    
    console.log(`✅ Address validation passed: ${address} (${addressType})`);
    return {
      isValid: true,
      type: addressType,
      script: script.toString('hex')
    };
    
  } catch (error) {
    console.log(`Address validation failed for ${address}:`, error.message);
    return {
      isValid: false,
      type: 'unknown',
      error: error.message
    };
  }
};

const validateAddressForPSBT = (address, options = {}) => {
  const { requireTaproot = false, requireOrdinalCompatible = false } = options;
  
  try {
    const validationResult = validateAddress(address, requireTaproot);
    
    if (!validationResult.isValid) {
      return false;
    }
    
    // Additional validation for Ordinal compatibility
    if (requireOrdinalCompatible && validationResult.type !== 'p2tr') {
      console.log(`Ordinal-compatible address required (Taproot) but got: ${validationResult.type}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`Address validation failed for ${address}:`, error.message);
    return false;
  }
};

// ✅ NEW: Utility to analyze address and provide recommendations
export const analyzeAddress = (address) => {
  try {
    const addressType = getAddressType(address);
    const validation = validateAddress(address);
    
    const analysis = {
      address,
      type: addressType,
      isValid: validation.isValid,
      network: isTestnet ? 'testnet' : 'mainnet',
      isTaproot: addressType === 'p2tr',
      isNativeSegwit: addressType === 'p2wpkh',
      isCompatibleWithOrdinals: addressType === 'p2tr',
      recommendations: []
    };
    
    // Provide recommendations based on address type
    if (addressType === 'p2tr') {
      analysis.recommendations.push('✅ Perfect for Ordinals - Taproot addresses are required for creating and storing inscriptions');
    } else if (addressType === 'p2wpkh') {
      analysis.recommendations.push('⚠️ Native SegWit - Good for BTC but cannot store Ordinals. Use for fee payments only.');
    } else if (addressType === 'p2sh') {
      analysis.recommendations.push('❌ Nested SegWit - Not recommended for Ordinals. Consider migrating to Taproot.');
    } else if (addressType === 'p2pkh') {
      analysis.recommendations.push('❌ Legacy - Not compatible with Ordinals. Upgrade to Taproot for inscription support.');
    }
    
    // Network-specific recommendations
    if (isTestnet) {
      analysis.recommendations.push('🌐 Testnet address - Use for testing only');
      if (addressType === 'p2tr' && !address.startsWith('tb1p')) {
        analysis.recommendations.push('❌ Invalid testnet Taproot format - should start with "tb1p"');
      }
    } else {
      analysis.recommendations.push('🌐 Mainnet address - Use for real transactions');
      if (addressType === 'p2tr' && !address.startsWith('bc1p')) {
        analysis.recommendations.push('❌ Invalid mainnet Taproot format - should start with "bc1p"');
      }
    }
    
    return analysis;
  } catch (error) {
    return {
      address,
      type: 'unknown',
      isValid: false,
      error: error.message
    };
  }
};

// ✅ NEW: Get address information for debugging
export const getAddressInfo = (address) => {
  const analysis = analyzeAddress(address);
  const script = bitcoin.address.toOutputScript(address, currentNetwork);
  
  return {
    ...analysis,
    script: script.toString('hex'),
    scriptLength: script.length,
    isTestnet: isTestnet,
    expectedPrefix: isTestnet ? 'tb1p' : 'bc1p'
  };
};

// ============================================================================
// OWNERSHIP VERIFICATION
// ============================================================================

// ✅ UPDATED: Enhanced ownership verification with Taproot validation
export const verifyOwnership = async (inscriptionId, address, options = {}) => {
  const { validateAddressType = true } = options;
  
  try {
    console.log(`🔍 Verifying ownership of ${inscriptionId} for address ${address}`);
    
    // Validate address for current network
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      throw new AppError(`Invalid ${isTestnet ? 'testnet' : 'mainnet'} address`, 400);
    }
    
    // Optional: Validate that the address is Taproot (for Ordinals)
    if (validateAddressType && addressValidation.type !== 'p2tr') {
      console.warn(`⚠️ Warning: Address ${address} is ${addressValidation.type.toUpperCase()} but Ordinals typically use Taproot (P2TR)`);
    }

    let inscriptionData;

    // Use different APIs based on network
    if (isTestnet) {
      // Testnet: Use mempool.space testnet API
      inscriptionData = await getTestnetInscriptionData(inscriptionId);
    } else {
      // Mainnet: Use ordinals.com
      inscriptionData = await getMainnetInscriptionData(inscriptionId);
    }
    
    if (!inscriptionData) {
      throw new AppError('Inscription not found', 404);
    }

    // Check if the address matches the current owner
    console.log('Inscription address:', inscriptionData.address);
    console.log('Provided address:', address);
    console.log('Address type:', addressValidation.type);
    
    const isOwner = inscriptionData.address === address;
    
    if (isOwner) {
      console.log('✅ Ownership verified successfully');
    } else {
      console.log('❌ Ownership verification failed');
    }
    
    return {
      isOwner,
      addressType: addressValidation.type,
      inscriptionAddress: inscriptionData.address,
      inscriptionAddressType: getAddressType(inscriptionData.address)
    };
    
  } catch (error) {
    console.error('Ownership verification error:', error);
    throw new AppError(`Ownership verification failed: ${error.message}`, 400);
  }
};

// Get inscription data from mainnet (ordinals.com)
const getMainnetInscriptionData = async (inscriptionId) => {
  try {
    const response = await fetch(`https://ordinals.com/inscription/${inscriptionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch inscription data from ordinals.com');
    }
    
    const html = await response.text();
    
    // Parse the HTML using pattern matching
    const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
      .map(x => { 
        x[2] = x[2].replace(/<.*?>/gm, ''); 
        return x;
      })
      .reduce((a, b) => { 
        return { ...a, [b[1]]: b[2] };
      }, {});

    // Extract address from parsed data
    let address = null;
    
    if (data.address) {
      address = data.address;
    } else if (data.Address) {
      address = data.Address;
    } else {
      const addressMatch = html.match(/<dt>Address<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/);
      if (addressMatch) {
        address = addressMatch[1].replace(/<.*?>/g, '');
      }
    }

    if (!address) {
      const outputMatch = html.match(/<dt>output<\/dt>\s*<dd[^>]*>.*?\((.*?)\)<\/dd>/);
      if (outputMatch) {
        address = outputMatch[1];
      }
    }

    if (!address) {
      throw new Error('Could not extract address from inscription data');
    }

    return {
      address: address.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to fetch mainnet inscription data: ${error.message}`);
  }
};

// Get inscription data from testnet (Unisat API primary, Hiro secondary, mempool.space tertiary)
const getTestnetInscriptionData = async (inscriptionId) => {
  try {
    console.log(`🌐 Fetching testnet inscription from Unisat: ${inscriptionId}`);
    
    // Primary: Unisat Testnet API
    const unisatResponse = await fetch(
      `https://open-api-testnet.unisat.io/v1/indexer/inscription/info/${inscriptionId}`,
      {
        headers: {
          'accept': 'application/json',
          'User-Agent': 'OrdinalBot/1.0'
        }
      }
    );
    
    if (!unisatResponse.ok) {
      throw new Error(`Unisat API returned ${unisatResponse.status}`);
    }
    
    const unisatData = await unisatResponse.json();
    
    // Check if Unisat response is valid
    if (unisatData.code === 0 && unisatData.data) {
      const inscriptionData = unisatData.data;
      
      // Try to get address from different fields in Unisat response
      let address = inscriptionData.address;
      
      // If no address in main field, try to derive from utxo
      if (!address && inscriptionData.utxo && inscriptionData.utxo.address) {
        address = inscriptionData.utxo.address;
      }
      
      // If still no address, throw error
      if (!address) {
        throw new Error('Address not found in Unisat response');
      }
      
      return {
        address: address,
        txid: inscriptionData.utxo?.txid || '',
        value: inscriptionData.inSatoshi || inscriptionData.outSatoshi || 0
      };
    } else {
      throw new Error(`Unisat API error: ${unisatData.msg || 'Unknown error'}`);
    }
    
  } catch (unisatError) {
    console.log(`❌ Unisat API failed: ${unisatError.message}, trying Hiro testnet...`);
    
    // Secondary: Hiro Testnet API
    try {
      const hiroResponse = await fetch(
        `https://api.testnet.hiro.so/ordinals/v1/inscriptions/${inscriptionId}`,
        {
          headers: {
            'accept': 'application/json',
            'User-Agent': 'OrdinalBot/1.0'
          }
        }
      );
      
      if (hiroResponse.ok) {
        const hiroData = await hiroResponse.json();
        
        let address = hiroData.address;
        
        // If Hiro doesn't provide address, throw error
        if (!address) {
          throw new Error('Address not found in Hiro response');
        }
        
        return {
          address: address,
          txid: hiroData.genesis_tx_id || hiroData.txid,
          value: hiroData.value || 0
        };
      } else {
        throw new Error(`Hiro testnet API returned ${hiroResponse.status}`);
      }
      
    } catch (hiroError) {
      console.log(`❌ Hiro testnet API also failed: ${hiroError.message}, trying mempool.space...`);
      
      // Tertiary: Mempool.space Testnet API (transaction data)
      try {
        // Remove 'i0' suffix to get txid
        const txid = inscriptionId.replace(/i0$/, '');
        const mempoolResponse = await fetch(
          `https://mempool.space/testnet/api/tx/${txid}`,
          {
            headers: {
              'accept': 'application/json',
              'User-Agent': 'OrdinalBot/1.0'
            }
          }
        );
        
        if (mempoolResponse.ok) {
          const txData = await mempoolResponse.json();
          
          // Try to find address in transaction outputs
          let address = null;
          let value = 0;
          
          // Find the first output with an address
          for (const output of txData.vout || []) {
            if (output.scriptpubkey_address) {
              address = output.scriptpubkey_address;
              value = output.value || 0;
              break;
            }
          }
          
          // If no address found, throw error
          if (!address) {
            throw new Error('Address not found in mempool.space transaction data');
          }
          
          return {
            address: address,
            txid: txData.txid,
            value: value
          };
        } else {
          throw new Error(`Mempool.space API returned ${mempoolResponse.status}`);
        }
        
      } catch (mempoolError) {
        console.log(`❌ All testnet APIs failed: ${mempoolError.message}`);
        throw new Error(`All testnet data sources failed: ${mempoolError.message}`);
      }
    }
  }
};
// ============================================================================
// FEE CALCULATION UTILITIES (From Claude's Implementation)
// ============================================================================

/**
 * Fetch current recommended fee rates from mempool
 */
export const getRecommendedFeeRates = async (networkType = 'testnet') => {
  try {
    const { baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    const response = await fetch(`${baseMempoolApiUrl}/v1/fees/recommended`);
    if (!response.ok) {
      throw new Error('Failed to fetch fee rates');
    }
    
    const feeRates = await response.json();
    
    console.log('📊 Current fee rates:', feeRates);
    
    return {
      fastestFee: feeRates.fastestFee || 20,
      halfHourFee: feeRates.halfHourFee || 15,
      hourFee: feeRates.hourFee || 10,
      economyFee: feeRates.economyFee || 5,
      minimumFee: Math.max(feeRates.minimumFee || 1, MIN_RELAY_FEE)
    };
  } catch (error) {
    console.error('Error fetching fee rates:', error);
    return {
      fastestFee: 20,
      halfHourFee: 15,
      hourFee: 10,
      economyFee: 5,
      minimumFee: MIN_RELAY_FEE
    };
  }
};
export const calculateFee = (vins, vouts, recommendedFeeRate, includeChangeOutput = true) => {
  const baseTxSize = 10;
  const inSize = 180;
  const outSize = 34;

  const txSize = baseTxSize + (vins * inSize) + (vouts * outSize) + (includeChangeOutput * outSize);
  const fee = txSize * recommendedFeeRate;

  return fee;
};
/**
 * Estimate transaction virtual size
 * More accurate calculation based on input/output types
 */
export const estimateTransactionVSize = (inputs, outputs) => {
  // Base transaction overhead
  let vsize = 10.5;
  
  // Input sizes (in vbytes)
  const inputSizes = {
    p2pkh: 148,      // Legacy
    p2sh: 91,        // Nested SegWit (P2SH-P2WPKH)
    p2wpkh: 68,      // Native SegWit
    p2tr: 57.5       // Taproot (most efficient)
  };
  
  // Output sizes (in vbytes)
  const outputSizes = {
    p2pkh: 34,
    p2sh: 32,
    p2wpkh: 31,
    p2tr: 43
  };
  
  // Calculate input sizes
  for (const input of inputs) {
    const inputType = input.type || 'p2wpkh';
    vsize += inputSizes[inputType] || 68;
  }
  
  // Calculate output sizes
  for (const output of outputs) {
    const outputType = output.type || 'p2wpkh';
    vsize += outputSizes[outputType] || 31;
  }
  
  return Math.ceil(vsize);
};

export const calculateTransactionFee = (vsize, feeRate) => {
  return Math.ceil(vsize * feeRate);
};

// ============================================================================
// UTXO MANAGEMENT (From Claude's Implementation)
// ============================================================================

/**
 * Fetch UTXOs for an address
 */
export const fetchAddressUtxos = async (address, networkType = 'testnet') => {
  try {
    const { baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    console.log(`🔍 Fetching UTXOs for address: ${address}`);
    
    const response = await fetch(`${baseMempoolApiUrl}/address/${address}/utxo`);
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.status}`);
    }
    
    const utxos = await response.json();
    console.log(`✅ Found ${utxos.length} UTXOs`);
    
    return utxos.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      status: utxo.status
    }));
    
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    throw new AppError(`Failed to fetch UTXOs: ${error.message}`, 500);
  }
};

/**
 * Check if a UTXO contains an inscription
 */
/**
 * Check if a UTXO contains an inscription - IMPROVED VERSION
 */
/**
 * Check if UTXO contains inscription - Enhanced with Unisat API for testnet
 */
export const doesUtxoContainInscription = async (utxo, networkType = 'testnet') => {
  try {
    if (networkType === 'testnet') {
      // Use Unisat API for testnet
      const unisatUrl = 'https://open-api-testnet.unisat.io/v1/indexer/utxo';
      const response = await fetch(`${unisatUrl}/${utxo.txid}/${utxo.vout}`, {
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`Unisat API failed for ${utxo.txid}:${utxo.vout}, status: ${response.status}`);
        return false; // Conservative approach
      }
      
      const data = await response.json();
      
      // Check if UTXO has inscriptions
      if (data.code === 0 && data.data) {
        const hasInscription = data.data.inscriptionsCount > 0 || 
                              (data.data.inscriptions && data.data.inscriptions.length > 0);
        
        if (hasInscription) {
          console.log(`⚠️ UTXO ${utxo.txid}:${utxo.vout} contains ${data.data.inscriptionsCount} inscription(s) - skipping`);
        }
        
        return hasInscription;
      }
      
      // If data is null, no UTXO found or no inscriptions
      return false;
      
    } else {
      // Use ordinals.com for mainnet (original method)
      const { ordinalsExplorerUrl } = getNetworkConfig(networkType);
      
      const html = await fetch(`${ordinalsExplorerUrl}/output/${utxo.txid}:${utxo.vout}`)
        .then(response => response.text());

      return html.match(/class=thumbnails/) !== null;
    }
    
  } catch (error) {
    console.warn(`Could not check inscription for ${utxo.txid}:${utxo.vout}: ${error.message}`);
    // Conservative approach: if check fails, assume NO inscription
    return false;
  }
};
/**
 * Select UTXOs for payment (cardinal spendable only)
 * Implements coin selection algorithm
 */
export const selectPaymentUtxos = async (
  allUtxos,
  requiredAmount,
  additionalFeeBuffer = 10000,
  networkType = 'testnet'
) => {
  console.log(`💰 Selecting UTXOs for ${requiredAmount} sats + ${additionalFeeBuffer} buffer`);
  console.log(`📋 Total UTXOs available: ${allUtxos.length}`);
  
  const selectedUtxos = [];
  let totalSelected = 0;
  
  // Filter and sort UTXOs (exclude dummy UTXOs and sort by value descending)
  const candidateUtxos = allUtxos
    .filter(utxo => {
      const isNotDummy = utxo.value > DUMMY_UTXO_VALUE;
      if (!isNotDummy) {
        console.log(`  ❌ Skipping dummy UTXO: ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
      }
      return isNotDummy;
    })
    .sort((a, b) => b.value - a.value); // Sort descending by value
  
  console.log(`📋 Candidate UTXOs after filtering: ${candidateUtxos.length}`);
  
  for (const utxo of candidateUtxos) {
    // Check if UTXO contains inscription (OpenOrdex method)
    const hasInscription = await doesUtxoContainInscription(utxo, networkType);
    
    if (hasInscription) {
      console.log(`  ❌ Skipping inscribed UTXO: ${utxo.txid}:${utxo.vout}`);
      continue;
    }
    
    selectedUtxos.push(utxo);
    totalSelected += utxo.value;
    
    console.log(`  ✅ Selected UTXO: ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
    
    // Check if we have enough (including buffer)
    if (totalSelected >= requiredAmount + additionalFeeBuffer) {
      console.log(`✅ Sufficient funds: ${totalSelected} sats selected`);
      break;
    }
  }
  
  if (totalSelected < requiredAmount) {
    console.log(`❌ Insufficient cardinal UTXOs. Required: ${requiredAmount}, Found: ${totalSelected}`);
    throw new AppError(
      `Insufficient cardinal funds. Required: ${requiredAmount} sats, Available: ${totalSelected} sats`,
      400
    );
  }
  
  console.log(`✅ Total selected: ${totalSelected} sats from ${selectedUtxos.length} UTXOs`);
  
  return {
    utxos: selectedUtxos,
    totalValue: totalSelected
  };
};

/**
 * Find or validate dummy UTXO
 */
export const findDummyUtxo = async (allUtxos, networkType = 'testnet') => {
  console.log('🔍 Looking for dummy UTXO...');
  
  // Find UTXOs that could be dummy UTXOs (small value)
  const potentialDummyUtxos = allUtxos.filter(
    utxo => utxo.value >= DUMMY_UTXO_VALUE && utxo.value <= DUMMY_UTXO_VALUE * 2
  );
  
  for (const utxo of potentialDummyUtxos) {
    const hasInscription = await doesUtxoContainInscription(utxo, networkType);
    if (!hasInscription) {
      console.log(`✅ Found dummy UTXO: ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
      return utxo;
    }
  }
  
  console.log('❌ No dummy UTXO found');
  return null;
};


export const parsePSBT = (psbtData, networkType = 'testnet') => {
  try {
    const { network } = getNetworkConfig(networkType);
    
    console.log('🔍 Parsing PSBT data...');
    console.log('Data length:', psbtData.length);
    console.log('First 20 chars:', psbtData.substring(0, 20));

    let psbt;
    let format = 'unknown';

    // Try different parsing methods
    try {
      // Method 1: Try as base64 PSBT
      psbt = bitcoin.Psbt.fromBase64(psbtData, { network });
      format = 'base64';
      console.log('✅ Parsed as base64 PSBT');
    } catch (base64Error) {
      console.log('❌ Base64 parsing failed, trying hex...');
      
      try {
        // Method 2: Try as hex PSBT
        // Check if it looks like hex (only hex characters and even length)
        if (psbtData.match(/^[0-9a-fA-F]+$/) && psbtData.length % 2 === 0) {
          const buffer = Buffer.from(psbtData, 'hex');
          psbt = bitcoin.Psbt.fromBuffer(buffer, { network });
          format = 'hex';
          console.log('✅ Parsed as hex PSBT');
        } else {
          throw new Error('Not a valid hex string');
        }
      } catch (hexError) {
        console.log('❌ Hex parsing failed:', hexError.message);
        
        // Method 3: Try as raw transaction (fallback)
        try {
          // Check if it might be a raw transaction
          if (psbtData.length >= 64) {
            // Try to parse as transaction hex
            const tx = bitcoin.Transaction.fromHex(psbtData);
            console.log('⚠️ Data appears to be a raw transaction, not PSBT');
            
            // Convert transaction to PSBT for compatibility
            psbt = new bitcoin.Psbt({ network });
            tx.ins.forEach((input, index) => {
              psbt.addInput({
                hash: input.hash,
                index: input.index,
                sequence: input.sequence,
              });
            });
            tx.outs.forEach((output, index) => {
              psbt.addOutput({
                script: output.script,
                value: output.value,
              });
            });
            format = 'transaction_hex';
          } else {
            throw new Error('Data too short for transaction');
          }
        } catch (txError) {
          console.log('❌ Transaction parsing failed:', txError.message);
          throw new AppError(
            `Invalid PSBT format. Tried base64, hex, and transaction formats. ` +
            `Error: ${base64Error.message}`,
            400
          );
        }
      }
    }

    return {
      psbt,
      format,
      isValid: true,
      inputCount: psbt.txInputs.length,
      outputCount: psbt.txOutputs.length
    };

  } catch (error) {
    console.error('❌ PSBT parsing failed:', error);
    throw new AppError(`Failed to parse PSBT: ${error.message}`, 400);
  }
};

/**
 * Validate and normalize PSBT data from database
 */
export const normalizeSellerPSBT = (listing) => {
  try {
    if (!listing.signed_psbt) {
      throw new AppError('No signed PSBT found in listing', 400);
    }

    console.log('🔄 Normalizing seller PSBT from database...');
    
    // Try to parse the PSBT data
    const parsed = parsePSBT(listing.signed_psbt, listing.network || 'testnet');
    
    // Validate PSBT structure
    if (parsed.psbt.txInputs.length !== 1 || parsed.psbt.txOutputs.length !== 1) {
      throw new AppError('Invalid seller PSBT structure: expected 1 input and 1 output', 400);
    }

    // Verify the PSBT matches the listing inscription
    const input = parsed.psbt.txInputs[0];
    console.log('Input is',input);
    const psbtInput = `${input.hash.reverse().toString('hex')}:${input.index}`;
    console.log('psbtInput is',psbtInput);
    
    if (psbtInput !== listing.inscription_output) {
      throw new AppError(
        `PSBT input (${psbtInput}) does not match listing inscription (${listing.inscription_output})`,
        400
      );
    }else{
      console.log("mtaches inscrpttion")
    }

    console.log('✅ Seller PSBT normalized successfully');
    console.log('📊 Format:', parsed.format);
    console.log('🔗 Input matches listing:', psbtInput === listing.inscription_output);

    return {
      psbt: parsed.psbt,
      format: parsed.format,
      input: psbtInput,
      output: parsed.psbt.txOutputs[0]
    };

  } catch (error) {
    console.error('❌ Seller PSBT normalization failed:', error);
    throw new AppError(`Invalid seller PSBT in listing: ${error.message}`, 400);
  }
};
// ============================================================================
// TRANSACTION UTILITIES
// ============================================================================

/**
 * Get transaction hex from mempool
 */
export const getTransactionHex = async (txid, networkType = 'testnet') => {
  try {
    const { baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    const response = await fetch(`${baseMempoolApiUrl}/tx/${txid}/hex`);
    if (!response.ok) {
      throw new Error(`Transaction not found: ${response.status}`);
    }
    
    return await response.text();
    
  } catch (error) {
    throw new AppError(`Failed to fetch transaction: ${error.message}`, 500);
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
export const satToBtc = (sats) => {
  return Number(sats) / Math.pow(10, 8);
};

export const satsToFormattedDollarString = async (sats) => {
  const btcPrice = await getBitcoinPrice();
  return (satToBtc(sats) * btcPrice).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};



export const signDummyUtxoPSBT = async (unsignedPsbtBase64, networkType = 'testnet') => {
  try {
    console.log('🔏 Signing dummy UTXO PSBT...');
    
    const { network } = getNetworkConfig(networkType);

    // Validate PSBT format
    let psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(unsignedPsbtBase64, { network });
    } catch (error) {
      throw new AppError(`Invalid PSBT format: ${error.message}`, 400);
    }

    console.log(`📦 PSBT details - Inputs: ${psbt.txInputs.length}, Outputs: ${psbt.txOutputs.length}`);

    // For backend signing simulation
    // In production, this would integrate with actual wallet APIs
    const signedPSBT = await simulateDummyUtxoSigning(psbt, networkType);

    return {
      signed_psbt: signedPSBT,
      network: networkType,
      inputs_count: psbt.txInputs.length,
      outputs_count: psbt.txOutputs.length,
      next_step: 'Broadcast the signed PSBT using /broadcast-dummy-utxo endpoint'
    };

  } catch (error) {
    console.error('❌ Dummy UTXO PSBT signing error:', error);
    throw new AppError(`Failed to sign dummy UTXO PSBT: ${error.message}`, 500);
  }
};

/**
 * Broadcast signed dummy UTXO transaction
 * Body: {
 *   signed_psbt: string (base64),
 *   network?: 'testnet' | 'mainnet'
 * }
 */
export const broadcastDummyUtxoTransaction = async (signedPsbtBase64, networkType = 'testnet') => {
  try {
    console.log('📤 Broadcasting dummy UTXO transaction...');

    const { network, baseMempoolApiUrl } = getNetworkConfig(networkType);

    let txHex;
    let txId;

    try {
      // Try to parse as PSBT first
      const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64, { network });
      
      // Finalize all inputs if not already finalized
      for (let i = 0; i < psbt.inputCount; i++) {
        try {
          psbt.finalizeInput(i);
        } catch (e) {
          // Input might already be finalized, continue
          console.log(`Input ${i} already finalized or can't be finalized:`, e.message);
        }
      }

      const tx = psbt.extractTransaction();
      txHex = tx.toHex();
      txId = tx.getId();

    } catch (psbtError) {
      // If PSBT parsing fails, try as raw transaction hex
      console.log('Not a PSBT, trying as raw transaction...');
      
      if (signedPsbtBase64.length === 64 || signedPsbtBase64.match(/^[0-9a-fA-F]{64}$/)) {
        throw new AppError('Provided data appears to be a TXID. Please provide the signed PSBT or raw transaction hex.', 400);
      }
      
      // Try to parse as hex
      const tx = bitcoin.Transaction.fromHex(signedPsbtBase64);
      txHex = signedPsbtBase64;
      txId = tx.getId();
    }

    console.log(`📊 Transaction ID: ${txId}`);

    // Broadcast to mempool
    const broadcastResponse = await fetch(`${baseMempoolApiUrl}/tx`, {
      method: 'POST',
      body: txHex,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    if (!broadcastResponse.ok) {
      const errorText = await broadcastResponse.text();
      throw new Error(`Mempool API error: ${broadcastResponse.status} - ${errorText}`);
    }

    const broadcastTxId = await broadcastResponse.text();

    // Verify the TXID matches
    if (broadcastTxId !== txId) {
      console.warn(`TXID mismatch: expected ${txId}, got ${broadcastTxId}`);
    }

    console.log('✅ Dummy UTXO transaction broadcasted successfully!');

    return {
      txid: broadcastTxId,
      network: networkType,
      explorer_url: `${getNetworkConfig(networkType).baseMempoolUrl}/tx/${broadcastTxId}`,
      status: 'broadcasted',
      timestamp: new Date().toISOString(),
      next_steps: [
        'Wait for transaction confirmation',
        'Check status using /transaction-status endpoint',
        'After confirmation, you can proceed with ordinal purchases'
      ]
    };

  } catch (error) {
    console.error('❌ Dummy UTXO broadcast failed:', error);
    throw new AppError(`Broadcast failed: ${error.message}`, 500);
  }
};

/**
 * Complete dummy UTXO creation flow (all in one)
 * Body: {
 *   payer_address: string,
 *   number_of_dummy_utxos?: number,
 *   network?: 'testnet' | 'mainnet',
 *   fee_level?: 'hourFee'
 * }
 */
export const createDummyUtxoComplete = async (
  payerAddress,
  numberOfDummyUtxos = 1,
  networkType = 'testnet',
  feeLevel = 'hourFee'
) => {
  try {
    console.log('🚀 Starting complete dummy UTXO creation flow...');

    // Step 1: Generate PSBT
    console.log('📝 Step 1: Generating PSBT...');
    const generateResult = await generateDummyUtxoPSBT(
      payerAddress,
      numberOfDummyUtxos,
      networkType,
      feeLevel
    );

    // Step 2: Sign PSBT
    console.log('🔏 Step 2: Signing PSBT...');
    const signResult = await signDummyUtxoPSBT(
      generateResult.psbt,
      networkType
    );

    // Step 3: Broadcast
    console.log('📤 Step 3: Broadcasting...');
    const broadcastResult = await broadcastDummyUtxoTransaction(
      signResult.signed_psbt,
      networkType
    );

    console.log('✅ Dummy UTXO creation completed!');

    return {
      generation: generateResult.metadata,
      signing: {
        wallet_type: 'simulated', // In production, this would be the actual wallet type
        signed_at: new Date().toISOString()
      },
      broadcast: broadcastResult,
      status: 'completed',
      next_steps: [
        `Wait for transaction confirmation: ${broadcastResult.txid}`,
        'Check status using /transaction-status endpoint',
        'After 1 confirmation, you can proceed with ordinal purchases'
      ]
    };

  } catch (error) {
    console.error('❌ Complete dummy UTXO creation failed:', error);
    throw new AppError(`Complete dummy UTXO creation failed: ${error.message}`, 500);
  }
};

/**
 * Get transaction status for dummy UTXO
 * Body: {
 *   txid: string,
 *   network?: 'testnet' | 'mainnet'
 * }
 */
export const getDummyUtxoTransactionStatus = async (txid, networkType = 'testnet') => {
  try {
    const { baseMempoolApiUrl } = getNetworkConfig(networkType);

    console.log(`🔍 Checking status for dummy UTXO transaction: ${txid}`);

    const response = await fetch(`${baseMempoolApiUrl}/tx/${txid}/status`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          txid,
          status: 'not_found',
          confirmed: false,
          message: 'Transaction not found in mempool. It may not be broadcasted yet.'
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const status = await response.json();

    const isConfirmed = status.confirmed;
    const confirmationMessage = isConfirmed 
      ? `Confirmed at block ${status.block_height}`
      : 'Waiting for confirmation';

    return {
      txid,
      status: isConfirmed ? 'confirmed' : 'pending',
      confirmed: isConfirmed,
      block_height: status.block_height,
      confirmations: status.block_height ? await getConfirmations(status.block_height, networkType) : 0,
      timestamp: status.block_time,
      message: confirmationMessage,
      explorer_url: `${getNetworkConfig(networkType).baseMempoolUrl}/tx/${txid}`
    };

  } catch (error) {
    console.error('❌ Transaction status check failed:', error);
    throw new AppError(`Failed to check transaction status: ${error.message}`, 500);
  }
};

// ============================================================================
// INTERNAL HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate wallet signing for dummy UTXO PSBT
 * In production, replace with actual wallet integration
 */
const simulateDummyUtxoSigning = async (psbt, networkType) => {
  console.log(`🔐 Simulating wallet signing for dummy UTXO...`);
  
  // This is a simulation - in real implementation, you would:
  // 1. For Unisat: Use window.unisat.signPsbt() in frontend
  // 2. For Hiro: Use Stacks Connect
  // 3. For Xverse: Use their SDK
  
  // For backend testing, we'll just return the PSBT as-is
  // In real scenario, this would be signed by the user's wallet
  console.log('⚠️ NOTE: This is simulated signing. In production, use actual wallet integration.');
  
  return psbt.toBase64();
};

/**
 * Get confirmation count
 */
const getConfirmations = async (blockHeight, networkType) => {
  try {
    const { baseMempoolApiUrl } = getNetworkConfig(networkType);
    const response = await fetch(`${baseMempoolApiUrl}/blocks/tip/height`);
    const currentHeight = await response.json();
    return Math.max(0, currentHeight - blockHeight + 1);
  } catch (error) {
    return 0;
  }
};


// ============================================================================
// SELLER PSBT GENERATION (Your Existing Implementation)
// ============================================================================

// ✅ NEW: Create compressed transaction that maintains hash compatibility
const createCompressedTransaction = (transaction, outputIndex) => {
  try {
    // Create a minimal but valid transaction that includes the necessary data
    const minimalTx = new bitcoin.Transaction();
    
    // Copy version and locktime from original
    minimalTx.version = transaction.version;
    minimalTx.locktime = transaction.locktime;
    
    // Add ALL inputs (but with minimal data)
    transaction.ins.forEach((input, index) => {
      if (index === 0) {
        // For the input we're spending, include proper scriptSig if available
        minimalTx.addInput(
          input.hash,
          input.index,
          input.sequence,
          input.script
        );
      } else {
        // For other inputs, just include the basics
        minimalTx.addInput(
          input.hash,
          input.index,
          input.sequence
        );
      }
    });
    
    // Add ALL outputs (necessary for hash matching)
    transaction.outs.forEach((output, index) => {
      minimalTx.addOutput(output.script, output.value);
    });
    
    return minimalTx.toBuffer();
    
  } catch (error) {
    console.log('Compressed transaction creation failed, using original:', error.message);
    // Fallback to original transaction if compression fails
    return transaction.toBuffer();
  }
};

// FIXED: Generate Seller PSBT with proper UTXO handling
export const generateSellerPSBT = async (
  inscriptionId,
  inscriptionOutput,
  priceInput,
  sellerAddress,
  paymentAddress = null,
  network
) => {
  try {
    console.log(inscriptionId,inscriptionOutput,priceInput,sellerAddress,paymentAddress,network)
    setNetwork(network);
    const networkInfo = getNetworkInfo();
    console.log("🔄 Generating Seller PSBT...");
    console.log("Network:", networkInfo.networkName);

    // Use paymentAddress if provided, otherwise use sellerAddress
    const finalPaymentAddress = paymentAddress || sellerAddress;

    // ✅ ENHANCED: Validate addresses with Taproot requirement for seller
    if (!validateAddressForPSBT(sellerAddress, { requireOrdinalCompatible: true })) {
      throw new AppError(
        `Seller address must be a Taproot address for Ordinals. Got: ${getAddressType(sellerAddress)}`, 
        400
      );
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

    // ✅ ENHANCED: Verify ownership with address type validation
    console.log("🔍 Verifying seller ownership before generating PSBT...");
    const ownershipResult = await verifyOwnership(inscriptionId, sellerAddress, { validateAddressType: true });
    
    if (!ownershipResult.isOwner) {
      throw new AppError(
        `Seller does not own this inscription. Inscription ${inscriptionId} is not owned by ${sellerAddress}`, 
        403
      );
    }

    // 1️⃣ Parse "txid:vout"
    const [txid, vout] = inscriptionOutput.split(":");
    console.log(txid)
    if (!txid || vout === undefined) {
      throw new AppError("Invalid inscription_output format. Expected 'txid:vout'", 400);
    }

    const outputIndex = parseInt(vout);
    if (isNaN(outputIndex) || outputIndex < 0) {
      throw new AppError("Invalid output index in inscription_output", 400);
    }

    // 2️⃣ Fetch raw tx data
    const txHex = await getTransactionHex(txid,networkInfo.networkName);
    console.log("✅ Fetched transaction hex for inscription UTXO",txHex);

    let transaction;
    
    try {
      transaction = bitcoin.Transaction.fromHex(txHex);
      console.log("transaction",transaction)
    } catch (error) {
      throw new AppError(`Invalid transaction hex: ${error.message}`, 400);
    }

    // Validate output index exists
    if (outputIndex >= transaction.outs.length) {
      throw new AppError(`Output index ${outputIndex} not found in transaction (only ${transaction.outs.length} outputs)`, 400);
    }

    const inscriptionUtxo = transaction.outs[outputIndex];
    const utxoValue = inscriptionUtxo.value;

    // ✅ ENHANCED: Check if the UTXO script is Taproot
    const utxoAddress = bitcoin.address.fromOutputScript(inscriptionUtxo.script, currentNetwork);
    const utxoAddressType = getAddressType(utxoAddress);
    
    if (utxoAddressType !== 'p2tr') {
      console.warn(`⚠️ Warning: Inscription UTXO is ${utxoAddressType.toUpperCase()} but expected Taproot (P2TR)`);
    }

    // 3️⃣ Initialize PSBT
    const psbt = new bitcoin.Psbt({ network: currentNetwork });

    // 4️⃣ Create PROPER nonWitnessUtxo that matches the hash
    // ✅ FIX: Use the FULL transaction but compressed for size
    const compressedTx = createCompressedTransaction(transaction, outputIndex);
    
    // 5️⃣ Add ordinal UTXO as input - FIXED HASH FORMAT
    const input = {
      // ✅ FIX: Use proper hash format - reversed Buffer for bitcoinjs-lib
      hash: Buffer.from(txid, 'hex').reverse(),
      index: outputIndex,
      
      // ✅ FIX: Use compressed transaction data that matches the hash
      nonWitnessUtxo: compressedTx,
      
      // ✅ Include witnessUtxo for SegWit compatibility
      witnessUtxo: {
        script: inscriptionUtxo.script,
        value: utxoValue,
      },
      
      // ✅ Use SIGHASH_ALL for wallet compatibility
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    };

    psbt.addInput(input);

    // 6️⃣ Add payment output
    psbt.addOutput({
      address: finalPaymentAddress,
      value: priceSats,
    });

    const psbtBase64 = psbt.toBase64();

    console.log("✅ Seller PSBT generated successfully!");
    console.log("📦 PSBT Size:", psbtBase64.length, "chars (base64)");
    console.log("💎 UTXO Value:", utxoValue, "sats");
    console.log("💰 Asking Price:", priceSats, "sats");
    console.log("🌐 Network:", networkInfo.networkName);
    console.log("🔐 Ownership verified for seller:", sellerAddress);
    console.log("🏷️ Seller address type:", getAddressType(sellerAddress));
    console.log("🏷️ UTXO address type:", utxoAddressType);
    console.log("💡 Uses nonWitnessUtxo + witnessUtxo - maximum compatibility");
    
    return {
      psbt: psbtBase64,
      metadata: {
        sellerAddressType: getAddressType(sellerAddress),
        paymentAddressType: getAddressType(finalPaymentAddress),
        utxoAddressType: utxoAddressType,
        network: network,
        priceSats: priceSats,
        utxoValue: utxoValue,
        psbtType: 'enhanced' // nonWitnessUtxo + witnessUtxo
      }
    };

  } catch (error) {
    console.error("❌ Seller PSBT generation error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to generate seller PSBT: ${error.message}`, 500);
  }
};

export const generateSellerPSBTSimple = async (
  inscriptionId,
  inscriptionOutput,
  priceInput,
  sellerAddress,
  paymentAddress = null,
  network
) => {
  try {
    setNetwork(network);
    console.log("🔄 Generating Simple Seller PSBT (witnessUtxo only)...");

    const finalPaymentAddress = paymentAddress || sellerAddress;
    
    // ✅ ENHANCED: Validate addresses with Taproot requirement for seller
    if (!validateAddressForPSBT(sellerAddress, { requireOrdinalCompatible: true })) {
      throw new AppError(
        `Seller address must be a Taproot address for Ordinals. Got: ${getAddressType(sellerAddress)}`, 
        400
      );
    }

    if (!validateAddressForPSBT(finalPaymentAddress)) {
      throw new AppError(`Invalid payment address: ${finalPaymentAddress}`, 400);
    }

    // Ensure price is number in sats
    const priceSats = btcToSats(priceInput);
    if (priceSats <= 0) {
      throw new AppError("Invalid price: must be greater than 0", 400);
    }

    // ✅ ENHANCED: Verify ownership with address type validation
    console.log("🔍 Verifying seller ownership before generating PSBT...");
    const ownershipResult = await verifyOwnership(inscriptionId, sellerAddress, { validateAddressType: true });
    
    if (!ownershipResult.isOwner) {
      throw new AppError(
        `Seller does not own this inscription. Inscription ${inscriptionId} is not owned by ${sellerAddress}`, 
        403
      );
    }

    // Parse txid and vout
    const [txid, vout] = inscriptionOutput.split(":");
    if (!txid || vout === undefined) {
      throw new AppError("Invalid inscription_output format. Expected 'txid:vout'", 400);
    }

    const outputIndex = parseInt(vout);
    if (isNaN(outputIndex) || outputIndex < 0) {
      throw new AppError("Invalid output index in inscription_output", 400);
    }

    // Fetch transaction
    const txHex = await getTransactionHex(txid);
    const transaction = bitcoin.Transaction.fromHex(txHex);

    // Validate output index exists
    if (outputIndex >= transaction.outs.length) {
      throw new AppError(`Output index ${outputIndex} not found in transaction`, 400);
    }

    const inscriptionUtxo = transaction.outs[outputIndex];
    const utxoValue = inscriptionUtxo.value;

    // ✅ ENHANCED: Check if the UTXO script is Taproot
    const utxoAddress = bitcoin.address.fromOutputScript(inscriptionUtxo.script, currentNetwork);
    const utxoAddressType = getAddressType(utxoAddress);
    
    if (utxoAddressType !== 'p2tr') {
      console.warn(`⚠️ Warning: Inscription UTXO is ${utxoAddressType.toUpperCase()} but expected Taproot (P2TR)`);
    }

    // Create PSBT with only witnessUtxo (smaller size, works with most modern wallets)
    const psbt = new bitcoin.Psbt({ network: currentNetwork });

    // ✅ FIX: Use proper hash format
    psbt.addInput({
      hash: Buffer.from(txid, 'hex').reverse(), // Reversed buffer for bitcoinjs-lib
      index: outputIndex,
      witnessUtxo: {
        script: inscriptionUtxo.script,
        value: utxoValue,
      }
      // ✅ No sighashType - let wallet choose (better compatibility)
    });

    psbt.addOutput({
      address: finalPaymentAddress,
      value: priceSats,
    });

    const psbtBase64 = psbt.toBase64();

    console.log("✅ Simple Seller PSBT generated!");
    console.log("📦 PSBT Size:", psbtBase64.length, "chars (base64)");
    console.log("💎 UTXO Value:", utxoValue, "sats");
    console.log("💰 Asking Price:", priceSats, "sats");
    console.log("🔐 Ownership verified for seller:", sellerAddress);
    console.log("🏷️ Seller address type:", getAddressType(sellerAddress));
    console.log("🏷️ UTXO address type:", utxoAddressType);
    console.log("💡 Uses only witnessUtxo - compatible with modern wallets");
    
    return {
      psbt: psbtBase64,
      metadata: {
        sellerAddressType: getAddressType(sellerAddress),
        paymentAddressType: getAddressType(finalPaymentAddress),
        utxoAddressType: utxoAddressType,
        network: network,
        priceSats: priceSats,
        utxoValue: utxoValue
      }
    };

  } catch (error) {
    console.error("❌ Simple PSBT generation error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to generate simple PSBT: ${error.message}`, 500);
  }
};

 
// ============================================================================
/**
 * Generate Buyer PSBT for purchasing an ordinal
 * Enhanced with robust PSBT parsing
 */
export const generateBuyerPSBT = async (
  listing,
  buyerPaymentAddress,
  buyerReceiveAddress,
  networkType = 'testnet',
  feeLevel = 'hourFee'
) => {
  try {
    console.log('🔄 Generating Buyer PSBT...');
    
    const { network, baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    // ✅ STEP 1: Validate addresses
    console.log('✅ Step 1: Validating addresses...');
    
    // Validate payment address
    const paymentValidation = validateAddress(buyerPaymentAddress, networkType);
    if (!paymentValidation.isValid) {
      throw new AppError(`Invalid buyer payment address: ${paymentValidation.error}`, 400);
    }
    
    // Validate receive address MUST be Taproot for ordinals
    validateOrdinalAddress(buyerReceiveAddress, networkType);
    
    // ✅ STEP 2: Get fee rates
    console.log('✅ Step 2: Fetching fee rates...');
    const feeRates = await getRecommendedFeeRates(networkType);
    const selectedFeeRate = feeRates[feeLevel];
    console.log(`Selected fee rate (${feeLevel}):`, selectedFeeRate, 'sats/vbyte');
    
    // ✅ STEP 3: Fetch buyer's UTXOs
    console.log('✅ Step 3: Fetching buyer UTXOs...');
    const allBuyerUtxos = await fetchAddressUtxos(buyerPaymentAddress, networkType);
    
    if (allBuyerUtxos.length === 0) {
      throw new AppError('No UTXOs found for buyer address', 400);
    }
    
    // ✅ STEP 4: Check for existing dummy UTXO (optional)
    console.log('✅ Step 4: Checking for existing dummy UTXO...');
    const existingDummyUtxo = await findDummyUtxo(allBuyerUtxos, networkType);
    
    let requiresNewDummyUtxo = !existingDummyUtxo;
    
    if (existingDummyUtxo) {
      console.log(`✅ Found existing dummy UTXO: ${existingDummyUtxo.txid}:${existingDummyUtxo.vout} (${existingDummyUtxo.value} sats)`);
    } else {
      console.log(`⚠️ No existing dummy UTXO found. Will create one in this transaction.`);
    }
    
    // ✅ STEP 5: Parse seller's signed PSBT (ROBUST PARSING)
    console.log('✅ Step 5: Parsing seller PSBT...');
    
    // Use robust parser to handle any format
    const sellerPSBTData = normalizeSellerPSBT(listing);
    const sellerPsbt = sellerPSBTData.psbt;
    
    console.log(`📊 Seller PSBT format: ${sellerPSBTData.format}`);
    console.log(`🔗 Seller PSBT input: ${sellerPSBTData.input}`);
    console.log(`💰 Seller PSBT output value: ${sellerPSBTData.output.value} sats`);
    
    // Debug seller PSBT signatures
    console.log('🔍 Checking seller PSBT signatures...');
    const sellerInputData = sellerPsbt.data.inputs[0];
    console.log('  Seller signature data:', {
      hasTapKeySig: !!sellerInputData.tapKeySig,
      hasTapScriptSig: !!sellerInputData.tapScriptSig,
      hasPartialSig: !!sellerInputData.partialSig,
      partialSigCount: sellerInputData.partialSig ? sellerInputData.partialSig.length : 0,
      sighashType: sellerInputData.sighashType
    });
    
    // ✅ STEP 6: Calculate required amount and select UTXOs
    console.log('✅ Step 6: Calculating required amount...');
    
    // Calculate required amount
    let requiredAmount = listing.price_sats;
    
    // If we need to create a new dummy UTXO, add its cost
    if (requiresNewDummyUtxo) {
      requiredAmount += DUMMY_UTXO_VALUE;
      console.log(`➕ Adding ${DUMMY_UTXO_VALUE} sats for new dummy UTXO creation`);
    }
    
    // Estimate fee based on transaction structure
    const baseVins = 1 + (requiresNewDummyUtxo ? 0 : 1); // seller input + (existing dummy if available)
    const baseVouts = 2 + (requiresNewDummyUtxo ? 1 : 0); // ordinal + payment + (new dummy if needed)
    
    const estimatedFee = calculateFee(
      baseVins + 2, // base inputs + estimated payment UTXOs
      baseVouts + 1, // base outputs + change
      selectedFeeRate,
      true
    );
    
    console.log(`💰 Required amount: ${requiredAmount} sats + ${estimatedFee} sats fee`);
    
    // Select payment UTXOs
    const { utxos: paymentUtxos, totalValue: totalPaymentValue } = await selectPaymentUtxos(
      allBuyerUtxos,
      requiredAmount + estimatedFee,
      estimatedFee,
      networkType
    );
    
    // ✅ STEP 7: Build the PSBT (FIRST BUILD COMPLETE PSBT, THEN ADD SIGNATURES)
    console.log('✅ Step 7: Building buyer PSBT...');
    
    // STEP 7A: First build the complete unsigned PSBT
    console.log('  Step 7A: Building complete unsigned PSBT structure...');
    const psbt = new bitcoin.Psbt({ network });
    
    let totalInputValue = 0;
    
    // INPUT 1: Existing dummy UTXO (if available)
    if (existingDummyUtxo) {
      console.log('  Adding existing dummy UTXO input...');
      const dummyTxHex = await getTransactionHex(existingDummyUtxo.txid, networkType);
      const dummyTx = bitcoin.Transaction.fromHex(dummyTxHex);
      
      // Clear witnesses for compatibility
      for (const output in dummyTx.outs) {
        try { dummyTx.setWitness(parseInt(output), []); } catch { }
      }
      
      psbt.addInput({
        hash: existingDummyUtxo.txid,
        index: existingDummyUtxo.vout,
        nonWitnessUtxo: dummyTx.toBuffer(),
        witnessUtxo: dummyTx.outs[existingDummyUtxo.vout]
      });
      
      totalInputValue += existingDummyUtxo.value;
    }
    
    // INPUT 2: Seller's ordinal input (ADD UNSIGNED FIRST)
    console.log('  Adding seller ordinal input (unsigned)...');
    
    // Extract the input information from seller PSBT
    const sellerInput = sellerPsbt.data.globalMap.unsignedTx.tx.ins[0];
    
    // Get the transaction hex for the seller's input
    const sellerInputTxHex = await getTransactionHex(sellerInput.hash.reverse().toString('hex'), networkType);
    const sellerInputTx = bitcoin.Transaction.fromHex(sellerInputTxHex);
    
    // Add the input WITHOUT signatures first
    psbt.addInput({
      hash: sellerInput.hash.reverse().toString('hex'),
      index: sellerInput.index,
      nonWitnessUtxo: sellerInputTx.toBuffer(),
      witnessUtxo: sellerInputTx.outs[sellerInput.index],
      sighashType: sellerInputData.sighashType
    });
    
    const inscriptionValue = sellerInputData.witnessUtxo?.value || sellerPSBTData.output.value || 546;
    
    // OUTPUT 1: Ordinal to buyer
    console.log('  Adding ordinal output...');
    if (existingDummyUtxo) {
      // Use existing dummy UTXO value + inscription value
      psbt.addOutput({
        address: buyerReceiveAddress,
        value: existingDummyUtxo.value + inscriptionValue
      });
    } else {
      // Create new ordinal output with just inscription value
      psbt.addOutput({
        address: buyerReceiveAddress,
        value: inscriptionValue
      });
    }
    
    // OUTPUT 2: Payment to seller (from seller PSBT)
    console.log('  Adding payment to seller...');
    psbt.addOutput({
      ...sellerPSBTData.output
    });
    
    // INPUTS 3+: Payment UTXOs from buyer
    console.log('  Adding payment inputs...');
    for (const utxo of paymentUtxos) {
      const txHex = await getTransactionHex(utxo.txid, networkType);
      const tx = bitcoin.Transaction.fromHex(txHex);
      
      // Clear witnesses for compatibility
      for (const output in tx.outs) {
        try { tx.setWitness(parseInt(output), []); } catch { }
      }
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: tx.toBuffer(),
        witnessUtxo: tx.outs[utxo.vout]
      });
      
      totalInputValue += utxo.value;
    }
    
    // OUTPUT 3: Dummy UTXO (always needed for future purchases)
    console.log('  Adding dummy UTXO output...');
    psbt.addOutput({
      address: buyerPaymentAddress,
      value: DUMMY_UTXO_VALUE
    });
    
    // Calculate total output value
    let totalOutputValue = 
      (existingDummyUtxo ? existingDummyUtxo.value + inscriptionValue : inscriptionValue) + // ordinal output
      listing.price_sats +                    // payment to seller
      DUMMY_UTXO_VALUE;                       // dummy UTXO (always needed)
    
    // Calculate actual fee
    const actualVins = psbt.txInputs.length;
    const actualVouts = psbt.txOutputs.length;
    const actualFee = calculateFee(actualVins, actualVouts, selectedFeeRate, true);
    
    console.log(`📏 Actual vins: ${actualVins}, vouts: ${actualVouts}`);
    console.log(`💰 Actual fee: ${actualFee} sats`);
    
    // OUTPUT 4: Change back to buyer
    const changeValue = totalInputValue - totalOutputValue - actualFee;
    
    if (changeValue < 0) {
      const missingAmount = Math.abs(changeValue);
      throw new AppError(
        `Insufficient funds. Need ${missingAmount} more sats.\n\n` +
        `Breakdown:\n` +
        `• Listing price: ${listing.price_sats} sats\n` +
        `• Dummy UTXO: ${DUMMY_UTXO_VALUE} sats\n` +
        `• Transaction fee: ${actualFee} sats\n` +
        `• Total required: ${totalOutputValue + actualFee} sats\n` +
        `• Available: ${totalInputValue} sats\n` +
        `• Missing: ${missingAmount} sats`,
        400
      );
    }
    
    if (changeValue > 546) { // Only add change if above dust limit
      console.log('  Adding change output...');
      psbt.addOutput({
        address: buyerPaymentAddress,
        value: changeValue
      });
    } else {
      console.log(`  Change too small (${changeValue} sats), adding to fee`);
      // Adjust fee to include the small change
      totalOutputValue += changeValue;
    }
    
    // STEP 7B: Now copy seller signatures to the appropriate input
    console.log('  Step 7B: Copying seller signatures to PSBT...');
    
    // Determine which input index corresponds to the seller's ordinal
    // This depends on whether we added a dummy UTXO input first
    const sellerInputIndex = existingDummyUtxo ? 0 : 0; // Adjust based on your input order
    
    console.log(`  Copying seller signatures to input index: ${sellerInputIndex}`);
    
    // Copy all signature data to the specific input
    if (sellerInputData.tapKeySig) {
      psbt.data.inputs[sellerInputIndex].tapKeySig = sellerInputData.tapKeySig;
      console.log('  ✅ Added seller Taproot signature (tapKeySig)');
    }
    
    if (sellerInputData.tapScriptSig) {
      psbt.data.inputs[sellerInputIndex].tapScriptSig = sellerInputData.tapScriptSig;
      console.log('  ✅ Added seller Tapscript signatures');
    }
    
    if (sellerInputData.partialSig) {
      psbt.data.inputs[sellerInputIndex].partialSig = sellerInputData.partialSig;
      console.log(`  ✅ Added seller partial signatures (${sellerInputData.partialSig.length})`);
    }
    
    if (sellerInputData.tapLeafScript) {
      psbt.data.inputs[sellerInputIndex].tapLeafScript = sellerInputData.tapLeafScript;
      console.log('  ✅ Added seller tapLeafScript');
    }
    
    if (sellerInputData.tapInternalKey) {
      psbt.data.inputs[sellerInputIndex].tapInternalKey = sellerInputData.tapInternalKey;
      console.log('  ✅ Added seller tapInternalKey');
    }
    
    if (sellerInputData.tapMerkleRoot) {
      psbt.data.inputs[sellerInputIndex].tapMerkleRoot = sellerInputData.tapMerkleRoot;
      console.log('  ✅ Added seller tapMerkleRoot');
    }
    
    // 🔍 DEBUG: Verify signatures in final PSBT
    console.log('🔍 Verifying signatures in final buyer PSBT...');
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.data.inputs[i];
      const hasSig = input.tapKeySig || input.tapScriptSig || (input.partialSig && input.partialSig.length > 0);
      console.log(`  Input ${i}: ${hasSig ? '✅ SIGNED' : '❌ UNSIGNED'}`, {
        tapKeySig: !!input.tapKeySig,
        tapScriptSig: !!input.tapScriptSig,
        partialSig: input.partialSig ? input.partialSig.length : 0
      });
    }
    
    const psbtBase64 = psbt.toBase64();
    
    // Get Bitcoin price for USD conversion
    const btcPrice = await getBitcoinPrice();
    
    console.log('✅ Buyer PSBT generated successfully!');
    console.log('📦 Summary:');
    console.log('  - Inputs:', psbt.txInputs.length);
    console.log('  - Outputs:', psbt.txOutputs.length);
    console.log('  - Total Input:', totalInputValue, 'sats');
    console.log('  - Total Output:', totalOutputValue, 'sats');
    console.log('  - Fee:', actualFee, 'sats');
    console.log('  - Change:', changeValue, 'sats');
    console.log('  - Fee Rate:', selectedFeeRate, 'sats/vbyte');
    console.log('  - Dummy UTXO:', existingDummyUtxo ? 'Existing' : 'New');
    console.log('  - Seller Signatures Included:', sellerInputData.tapKeySig ? 'Yes (Taproot)' : 
                sellerInputData.partialSig ? 'Yes (Legacy)' : 'No');
    
    return {
      psbt: psbtBase64,
      metadata: {
        network: networkType,
        feeRate: selectedFeeRate,
        estimatedFee: actualFee,
        totalInput: totalInputValue,
        totalOutput: totalOutputValue,
        changeAmount: changeValue,
        vsize: actualVins * 180 + actualVouts * 34 + 10,
        dummyUtxo: existingDummyUtxo ? `${existingDummyUtxo.txid}:${existingDummyUtxo.vout}` : 'new',
        dummyUtxoStatus: existingDummyUtxo ? 'existing' : 'creating_new',
        paymentUtxosCount: paymentUtxos.length,
        usdPrice: (listing.price_sats / 100000000) * btcPrice,
        btcPrice: btcPrice,
        transactionType: existingDummyUtxo ? 'purchase_only' : 'purchase_with_dummy_creation',
        sellerPsbtFormat: sellerPSBTData.format,
        sellerSignaturesIncluded: !!sellerInputData.tapKeySig || !!sellerInputData.partialSig,
        signatureStatus: `${sellerInputData.tapKeySig || sellerInputData.partialSig ? 1 : 0}/${psbt.inputCount} inputs pre-signed`
      }
    };
    
  } catch (error) {
    console.error('❌ Buyer PSBT generation error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to generate buyer PSBT: ${error.message}`, 500);
  }
};

 const detectScriptType = (script) => {
  const scriptHex = script.toString('hex');
  
  if (scriptHex.startsWith('0014')) {
    return 'p2wpkh';
  } else if (scriptHex.startsWith('0020') || scriptHex.startsWith('5120')) {
    return 'p2tr';
  } else if (scriptHex.startsWith('a914')) {
    return 'p2sh';
  } else if (scriptHex.startsWith('76a914') && scriptHex.endsWith('88ac')) {
    return 'p2pkh';
  } else {
    return 'unknown';
  }
};

// ============================================================================
// DUMMY UTXO GENERATION (From Claude's Implementation)
// ============================================================================

/**
 * Generate PSBT for creating dummy UTXOs
 */
export const generateDummyUtxoPSBT = async (
  payerAddress,
  numberOfDummyUtxos = 1,
  networkType = 'testnet',
  feeLevel = 'hourFee'
) => {
  try {
    console.log('🔄 Generating dummy UTXO creation PSBT...');
    
    const { network, baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    // Validate address
    const addressValidation = validateAddress(payerAddress, networkType);
    if (!addressValidation.isValid) {
      throw new AppError(`Invalid payer address: ${addressValidation.error}`, 400);
    }
    
    // Get fee rates
    const feeRates = await getRecommendedFeeRates(networkType);
    const selectedFeeRate = feeRates[feeLevel];
    
    console.log(`📊 Current fee rates:`, feeRates);
    
    // Fetch UTXOs
    const allUtxos = await fetchAddressUtxos(payerAddress, networkType);
    
    if (allUtxos.length === 0) {
      throw new AppError('No UTXOs found for address', 400);
    }
    
    // Calculate required amount
    const totalDummyValue = numberOfDummyUtxos * DUMMY_UTXO_VALUE;
    
    // Estimate fee using OpenOrdex method
    const estimatedFee = calculateFee(
      allUtxos.length, // vins
      numberOfDummyUtxos + 1, // vouts (dummy UTXOs + change)
      selectedFeeRate,
      true // include change
    );
    
    console.log(`💰 Required: ${totalDummyValue} sats + ${estimatedFee} sats fee`);
    
    // Select UTXOs with OpenOrdex method
    const { utxos, totalValue } = await selectPaymentUtxos(
      allUtxos,
      totalDummyValue + estimatedFee,
      estimatedFee,
      networkType
    );
    
    // Build PSBT (OpenOrdex approach)
    const psbt = new bitcoin.Psbt({ network });
    
    // Add inputs
    for (const utxo of utxos) {
      const txHex = await getTransactionHex(utxo.txid, networkType);
      const tx = bitcoin.Transaction.fromHex(txHex);
      
      // Clear witnesses for compatibility (OpenOrdex approach)
      for (const output in tx.outs) {
        try { 
          tx.setWitness(parseInt(output), []); 
        } catch { }
      }
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: tx.toBuffer(),
        witnessUtxo: tx.outs[utxo.vout]
      });
    }
    
    // Add dummy UTXO outputs
    for (let i = 0; i < numberOfDummyUtxos; i++) {
      psbt.addOutput({
        address: payerAddress,
        value: DUMMY_UTXO_VALUE
      });
    }
    
    // Calculate change
    const changeValue = totalValue - totalDummyValue - estimatedFee;
    
    // Add change output if above dust limit
    if (changeValue > 546) {
      psbt.addOutput({
        address: payerAddress,
        value: changeValue
      });
    }
    
    console.log('✅ Dummy UTXO PSBT generated successfully!');
    
    return {
      psbt: psbt.toBase64(),
      metadata: {
        numberOfDummyUtxos,
        totalDummyValue,
        fee: estimatedFee,
        changeValue,
        addressType: addressValidation.type,
        selectedUtxos: utxos.length,
        totalInput: totalValue
      }
    };
    
  } catch (error) {
    console.error('❌ Dummy UTXO PSBT generation error:', error);
    throw new AppError(`Failed to generate dummy UTXO PSBT: ${error.message}`, 500);
  }
};
// ============================================================================
// PSBT SIGNING & VERIFICATION (Your Existing Implementation)
// ============================================================================

// Utility function to convert hex to PSBT
export const hexToPsbt = (psbtHex) => {
  try {
    return bitcoin.Psbt.fromHex(psbtHex, { network: currentNetwork });
  } catch (error) {
    throw new AppError(`Invalid PSBT hex: ${error.message}`, 400);
  }
};

// Additional utility: Decode and analyze PSBT
export const analyzePSBT = (psbtBase64) => {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: currentNetwork });
    
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
    return bitcoin.address.fromOutputScript(script, currentNetwork);
  } catch (error) {
    return 'Unknown script type';
  }
};

export const validatePSBT = async (psbtBase64, inscriptionOutput, expectedAmount) => {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: currentNetwork });

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

// Enhanced PSBT signing with ownership verification
export const signPSBTWithWalletService = async (unsignedPsbtBase64, signingAddress, networkType = 'testnet', walletType = 'unisat') => {
  try {
    setNetwork(networkType);
    const networkInfo = getNetworkInfo();
    
    console.log("🔄 Initiating PSBT signing with wallet...");
    console.log("Wallet Type:", walletType);
    console.log("Network:", networkInfo.networkName);
    console.log("Signing Address:", signingAddress);

    // Validate the PSBT first
    const psbt = bitcoin.Psbt.fromBase64(unsignedPsbtBase64, { network: currentNetwork });
    
    // Analyze the PSBT before signing
    const psbtAnalysis = analyzePSBTInternal(psbt);
    
    console.log("📋 PSBT Analysis:", {
      inputs: psbtAnalysis.inputs.length,
      outputs: psbtAnalysis.outputs.length,
      requiresSigning: psbtAnalysis.inputs.filter(input => !input.hasPartialSig).length
    });

    // ✅ OWNERSHIP VERIFICATION: Check if signing address owns the ordinal
    const ownershipVerified = await verifyPSBTOwnership(psbtAnalysis, signingAddress, networkType);
    
    if (!ownershipVerified) {
      throw new AppError(`You are not the owner of this inscription. Signing address ${signingAddress} does not match the inscription owner.`, 403);
    }

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
      instructions: getWalletSigningInstructions(walletType),
      ownership_verified: true,
      signing_address: signingAddress
    };

    // In a real implementation, this would trigger the wallet's signing interface
    // For now, we'll simulate the wallet interaction and provide instructions
    
    const result = {
      signing_request: signingRequest,
      status: 'pending_wallet_signature',
      message: `Please sign the PSBT using your ${walletType} wallet`,
      ownership_verified: true,
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
          signed: input.hasPartialSig,
          owned_by_signer: input.address === signingAddress
        })),
        outputs: psbtAnalysis.outputs.map(output => ({
          index: output.index,
          address: output.address,
          value: output.value
        }))
      }
    };

    console.log("✅ PSBT prepared for wallet signing - Ownership verified!");
    return result;

  } catch (error) {
    console.error("❌ PSBT signing preparation error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to prepare PSBT for signing: ${error.message}`, 500);
  }
};

// Verify PSBT ownership by checking if the signing address matches the inscription owner
const verifyPSBTOwnership = async (psbtAnalysis, signingAddress, networkType) => {
  try {
    console.log("🔍 Verifying PSBT ownership...");
    
    // Find the ordinal input (usually the first input)
    const ordinalInputs = psbtAnalysis.inputs.filter(input => {
      // Look for inputs that might be ordinals (based on value or pattern)
      return input.value === 546 || input.value === 1000; // Common ordinal values
    });

    if (ordinalInputs.length === 0) {
      console.log("⚠️ No ordinal inputs found, using first input for ownership check");
      // If no obvious ordinal inputs, use the first input
      ordinalInputs.push(psbtAnalysis.inputs[0]);
    }

    for (const input of ordinalInputs) {
      console.log(`Checking input ${input.index}: ${input.txid}:${input.vout}`);
      
      // Extract inscription ID from input (simplified - you might need a better method)
      const inscriptionId = `${input.txid}i${input.vout}`;
      
      try {
        // Verify ownership of this inscription
        const isOwner = await verifyOwnership(inscriptionId, signingAddress);
        
        if (isOwner) {
          console.log(`✅ Ownership verified for inscription ${inscriptionId}`);
          return true;
        } else {
          console.log(`❌ Ownership failed for inscription ${inscriptionId}`);
          console.log(`   Inscription owner: ${input.address}`);
          console.log(`   Signing address: ${signingAddress}`);
        }
      } catch (ownershipError) {
        console.log(`⚠️ Ownership check failed for ${inscriptionId}:`, ownershipError.message);
        
        // Fallback: Check if the input address matches the signing address
        if (input.address === signingAddress) {
          console.log(`✅ Fallback ownership check passed - input address matches signing address`);
          return true;
        }
      }
    }

    // If we get here, no ownership was verified
    console.log("❌ No ownership verification passed for any input");
    return false;
    
  } catch (error) {
    console.error("Ownership verification error:", error);
    return false;
  }
};

// Updated verifySignedPSBTService to handle Taproot signatures
export const verifySignedPSBTService = async (signedData, networkType = 'testnet', options = {}) => {
  const { requireFinalization = false, isForListing = false } = options;
  
  try {
    setNetwork(networkType);
    const networkInfo = getNetworkInfo();
    
    console.log("🔍 Verifying signed data...");
    console.log("Network:", networkInfo.networkName);
    console.log("Data length:", signedData.length);
    console.log("First 20 chars:", signedData.substring(0, 20));

    let isPSBT = false;
    let isTransaction = false;
    let finalTx = null;
    let psbt = null;
    let detectedFormat = 'unknown';

    try {
      if (signedData.startsWith('70736274')) {
        console.log("✅ Detected PSBT in hex format (from Unisat)");
        detectedFormat = 'PSBT (hex)';
        const psbtBuffer = Buffer.from(signedData, 'hex');
        psbt = bitcoin.Psbt.fromBuffer(psbtBuffer, { network: currentNetwork });
        isPSBT = true;
      }  else if (signedData.includes('=') || signedData.length % 4 === 0) {
        // Try as Base64 PSBT
        console.log("🔄 Trying as Base64 PSBT...");
        detectedFormat = 'PSBT (base64)';
        psbt = bitcoin.Psbt.fromBase64(signedData, { network: currentNetwork });
        isPSBT = true;
        
      } else if (signedData.match(/^[0-9a-fA-F]+$/)) {
        // Try as hex transaction
        console.log("🔄 Trying as hex transaction...");
        detectedFormat = 'Transaction (hex)';
        finalTx = bitcoin.Transaction.fromHex(signedData);
        isTransaction = true;
      } else {
        // Last attempt: try as base64 transaction
        console.log("🔄 Trying as base64 transaction...");
        detectedFormat = 'Transaction (base64)';
        const buffer = Buffer.from(signedData, 'base64');
        finalTx = bitcoin.Transaction.fromBuffer(buffer);
        isTransaction = true;
      }
    } catch (error) {
      console.log("❌ Format detection failed:", error.message);
      throw new AppError(`Unsupported format. Detected as: ${detectedFormat}. Error: ${error.message}`, 400);
    }

    let analysis = {};
    let hasAnySignatures = false;
    let signatureCount = 0;
    let isFullySigned = false;
    let canFinalize = false;
    let finalizeError = null;
if (isPSBT) {
  console.log("📊 Analyzing PSBT...");
  analysis = analyzePSBTInternal(psbt);
  
  // FIXED: Use the corrected analysis from analyzePSBTInternal
  hasAnySignatures = analysis.signatureAnalysis.signedInputs > 0;
  signatureCount = analysis.signatureAnalysis.totalSignatures;
  isFullySigned = analysis.signatureAnalysis.signedInputs === analysis.signatureAnalysis.totalInputs;
  
  console.log(`📋 Signature Status: ${signatureCount} signatures across ${analysis.inputs.length} inputs`);
  console.log(`🔐 Has any signatures: ${hasAnySignatures}`);
  console.log(`✅ Fully signed: ${isFullySigned}`);
  console.log(`🔷 Taproot detected: ${analysis.signatureAnalysis.taprootInputs > 0}`);
  console.log(`📊 Signature breakdown:`, analysis.signatureAnalysis.signatureBreakdown);

  // Finalization check
  try {
    let finalizablePsbt;
    if (detectedFormat === 'PSBT (hex)') {
      finalizablePsbt = bitcoin.Psbt.fromBuffer(Buffer.from(signedData, 'hex'), { network: currentNetwork });
    } else {
      finalizablePsbt = bitcoin.Psbt.fromBase64(signedData, { network: currentNetwork });
    }
    
    finalizablePsbt.finalizeAllInputs();
    finalTx = finalizablePsbt.extractTransaction();
    canFinalize = true;
    console.log("✅ PSBT finalized successfully");
  } catch (finalizeErr) {
    canFinalize = false;
    finalizeError = finalizeErr.message;
    console.log("⚠️ PSBT finalization failed:", finalizeErr.message);
  }
}

    const verificationResult = {
      isPSBT,
      isTransaction,
      isSigned: hasAnySignatures,
      isFullySigned,
      canFinalize,
      hasAnySignatures,
      signatureCount,
      inputCount: analysis.inputs?.length || 0,
      finalizeError,
      network: networkType,
      dataFormat: detectedFormat,
      inputs: analysis.inputs || [],
      outputs: analysis.outputs || [],
      errors: [],
      warnings: []
    };

    // Add specific information about signature types
    if (analysis.inputs?.some(input => input.hasTapKeySig)) {
      verificationResult.signatureType = 'taproot';
      console.log("🎯 Taproot signature detected");
    } else if (analysis.inputs?.some(input => input.hasPartialSig)) {
      verificationResult.signatureType = 'legacy';
      console.log("🎯 Legacy signature detected");
    }

    if (isPSBT && hasAnySignatures && !isFullySigned) {
      verificationResult.warnings.push(
        `PSBT is partially signed (${signatureCount}/${analysis.inputs.length} inputs).`
      );
    }

    verificationResult.readyForBroadcast = verificationResult.isFullySigned && verificationResult.canFinalize;

    console.log("🎯 Final Verification Result:", {
      hasSignatures: verificationResult.hasAnySignatures,
      signatureCount: verificationResult.signatureCount,
      fullySigned: verificationResult.isFullySigned,
      canFinalize: verificationResult.canFinalize,
      signatureType: verificationResult.signatureType
    });

    return verificationResult;

  } catch (error) {
    console.error("❌ Verification error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to verify: ${error.message}`, 500);
  }
};

// FIXED analyzePSBTInternal function
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

      // Check for traditional signatures
      const partialSigCount = inputData.partialSig ? inputData.partialSig.length : 0;
      const hasPartialSig = partialSigCount > 0;

      // FIXED: Check for Taproot signatures
      const hasTapKeySig = !!inputData.tapKeySig;
      
      // FIXED: tapScriptSig is an OBJECT, not an array!
      const hasTapScriptSig = !!inputData.tapScriptSig && Object.keys(inputData.tapScriptSig).length > 0;
      const tapScriptSigCount = inputData.tapScriptSig ? Object.keys(inputData.tapScriptSig).length : 0;

      // FIXED: Calculate total signatures for this input
      const totalSignaturesForInput = partialSigCount + (hasTapKeySig ? 1 : 0) + tapScriptSigCount;
      const isInputSigned = hasPartialSig || hasTapKeySig || hasTapScriptSig;

      console.log(`  Input ${index} signature analysis:`, {
        traditional: partialSigCount,
        tapKeySig: hasTapKeySig ? 1 : 0,
        tapScriptSig: tapScriptSigCount,
        total: totalSignaturesForInput,
        signed: isInputSigned
      });

      return {
        index,
        txid: input.hash.reverse().toString('hex'),
        vout: input.index,
        address: address,
        value: inputData.witnessUtxo ? inputData.witnessUtxo.value : 0,
        
        // Traditional signature info
        hasPartialSig,
        partialSigCount,
        
        // Taproot signature info
        hasTapKeySig,
        hasTapScriptSig,
        tapScriptSigCount,
        
        // FIXED: Add calculated fields
        totalSignatures: totalSignaturesForInput,
        isSigned: isInputSigned,
        
        hasFinalScript: !!(inputData.finalScriptSig || inputData.finalScriptWitness),
        sighashType: inputData.sighashType,
        
        // Additional debug info
        signatureDetails: {
          traditional: inputData.partialSig ? inputData.partialSig.map(sig => ({
            pubkey: sig.pubkey.toString('hex'),
            signature: sig.signature.toString('hex').substring(0, 32) + '...'
          })) : [],
          taproot: {
            tapKeySig: inputData.tapKeySig ? 'Present' : 'None',
            tapScriptSigCount: tapScriptSigCount
          }
        }
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
    })
  };
  
  // FIXED: Enhanced signature analysis
  analysis.signatureAnalysis = {
    totalInputs: psbt.txInputs.length,
    signedInputs: analysis.inputs.filter(input => input.isSigned).length,
    totalSignatures: analysis.inputs.reduce((count, input) => count + input.totalSignatures, 0),
    taprootInputs: analysis.inputs.filter(input => input.hasTapKeySig || input.hasTapScriptSig).length,
    legacyInputs: analysis.inputs.filter(input => input.hasPartialSig).length,
    
    // FIXED: Detailed breakdown
    signatureBreakdown: {
      traditional: analysis.inputs.reduce((count, input) => count + input.partialSigCount, 0),
      tapKey: analysis.inputs.filter(input => input.hasTapKeySig).length,
      tapScript: analysis.inputs.reduce((count, input) => count + input.tapScriptSigCount, 0)
    }
  };
  
  console.log(`📈 PSBT Analysis: ${analysis.signatureAnalysis.signedInputs}/${analysis.signatureAnalysis.totalInputs} inputs signed`);
  console.log(`🔢 Total signatures: ${analysis.signatureAnalysis.totalSignatures}`);
  console.log(`🎯 Taproot inputs: ${analysis.signatureAnalysis.taprootInputs}`);
  console.log(`🔷 Legacy inputs: ${analysis.signatureAnalysis.legacyInputs}`);
  console.log(`📊 Signature breakdown:`, analysis.signatureAnalysis.signatureBreakdown);
  
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

// Comprehensive PSBT/Transaction Decoder
export const decodePSBTData = async (encodedData, networkType = 'testnet') => {
  try {
    setNetwork(networkType);
    const networkInfo = getNetworkInfo();
    
    console.log("🔍 Decoding PSBT/Transaction data...");
    console.log("Network:", networkInfo.networkName);
    console.log("Data length:", encodedData.length);

    let decodedData = {
      format: 'unknown',
      isPSBT: false,
      isTransaction: false,
      isSigned: false,
      rawData: encodedData,
      network: networkType,
      extractedData: {},
      inputs: [],
      outputs: [],
      fees: 0,
      analysis: {}
    };

    // Try to detect and parse the data
    if (encodedData.startsWith('70736274')) {
      // PSBT in hex format (from Unisat)
      decodedData.format = 'PSBT (hex)';
      decodedData.isPSBT = true;
      
      const psbtBuffer = Buffer.from(encodedData, 'hex');
      const psbt = bitcoin.Psbt.fromBuffer(psbtBuffer, { network: currentNetwork });
      
      decodedData = await extractPSBTData(psbt, decodedData);
      
    } else if (encodedData.includes('=') || encodedData.length % 4 === 0) {
      // Try as Base64 PSBT
      try {
        const psbt = bitcoin.Psbt.fromBase64(encodedData, { network: currentNetwork });
        decodedData.format = 'PSBT (base64)';
        decodedData.isPSBT = true;
        decodedData = await extractPSBTData(psbt, decodedData);
      } catch (psbtError) {
        // Try as base64 transaction
        try {
          const buffer = Buffer.from(encodedData, 'base64');
          const transaction = bitcoin.Transaction.fromBuffer(buffer);
          decodedData.format = 'Transaction (base64)';
          decodedData.isTransaction = true;
          decodedData = await extractTransactionData(transaction, decodedData);
        } catch (txError) {
          throw new Error(`Not a valid PSBT or transaction: ${psbtError.message}`);
        }
      }
    } else if (encodedData.match(/^[0-9a-fA-F]+$/)) {
      // Try as hex transaction
      try {
        const transaction = bitcoin.Transaction.fromHex(encodedData);
        decodedData.format = 'Transaction (hex)';
        decodedData.isTransaction = true;
        decodedData = await extractTransactionData(transaction, decodedData);
      } catch (txError) {
        throw new Error(`Not a valid transaction hex: ${txError.message}`);
      }
    } else {
      throw new Error('Unsupported data format');
    }

    // Calculate fees if we have both inputs and outputs
    if (decodedData.inputs.length > 0 && decodedData.outputs.length > 0) {
      const totalInput = decodedData.inputs.reduce((sum, input) => sum + input.value, 0);
      const totalOutput = decodedData.outputs.reduce((sum, output) => sum + output.value, 0);
      decodedData.fees = totalInput - totalOutput;
      decodedData.analysis.feeRate = Math.round(decodedData.fees / decodedData.rawData.length * 100) / 100;
    }

    console.log("✅ Data decoded successfully");
    return decodedData;

  } catch (error) {
    console.error("❌ Data decoding error:", error);
    throw new AppError(`Failed to decode data: ${error.message}`, 500);
  }
};

// Extract data from PSBT
const extractPSBTData = async (psbt, decodedData) => {
  const analysis = analyzePSBTInternal(psbt);
  
  decodedData.isSigned = analysis.isSigned;
  decodedData.isFullySigned = analysis.inputs.every(input => input.hasPartialSig);
  decodedData.inputs = analysis.inputs;
  decodedData.outputs = analysis.outputs;
  decodedData.version = analysis.version;
  decodedData.locktime = analysis.locktime;
  
  // Extract original data from inputs
  decodedData.extractedData = await extractOriginalDataFromPSBT(psbt);
  
  // Try to finalize and extract transaction
  try {
    const finalPsbt = bitcoin.Psbt.fromBase64(psbt.toBase64(), { network: currentNetwork });
    finalPsbt.finalizeAllInputs();
    const finalTx = finalPsbt.extractTransaction();
    
    decodedData.finalTransaction = {
      txid: finalTx.getId(),
      hex: finalTx.toHex(),
      size: finalTx.toBuffer().length
    };
    decodedData.canFinalize = true;
  } catch (finalizeError) {
    decodedData.canFinalize = false;
    decodedData.analysis.finalizationError = finalizeError.message;
  }

  return decodedData;
};

// Extract data from Transaction
const extractTransactionData = async (transaction, decodedData) => {
  decodedData.isSigned = true;
  decodedData.isFullySigned = true;
  decodedData.canFinalize = true;
  decodedData.version = transaction.version;
  decodedData.locktime = transaction.locktime;
  
  // Extract inputs
  decodedData.inputs = transaction.ins.map((input, index) => {
    return {
      index,
      txid: input.hash.reverse().toString('hex'),
      vout: input.index,
      script: input.script.toString('hex'),
      sequence: input.sequence,
      value: 0, // Transaction doesn't contain input values
      address: 'Unknown (need UTXO data)'
    };
  });

  // Extract outputs
  decodedData.outputs = transaction.outs.map((output, index) => {
    let address = 'Unknown';
    try {
      address = bitcoin.address.fromOutputScript(output.script, currentNetwork);
    } catch (e) {
      // Could be OP_RETURN or other non-standard script
      if (output.script.length === 0) {
        address = 'Empty Script';
      } else {
        address = `Non-standard: ${output.script.toString('hex').substring(0, 20)}...`;
      }
    }

    return {
      index,
      address,
      value: output.value,
      script: output.script.toString('hex')
    };
  });

  decodedData.finalTransaction = {
    txid: transaction.getId(),
    hex: transaction.toHex(),
    size: transaction.toBuffer().length
  };

  return decodedData;
};

// Extract original listing data from PSBT inputs
const extractOriginalDataFromPSBT = async (psbt) => {
  const extracted = {
    inscription_id: null,
    inscription_output: null,
    price_sats: null,
    seller_address: null,
    payment_address: null,
    network: null
  };

  try {
    // Get the first input (assuming it's the ordinal being sold)
    if (psbt.txInputs.length > 0) {
      const firstInput = psbt.txInputs[0];
      extracted.inscription_output = `${firstInput.hash.reverse().toString('hex')}:${firstInput.index}`;
      
      // Try to get inscription ID from the input data
      const inputData = psbt.data.inputs[0];
      if (inputData && inputData.nonWitnessUtxo) {
        const tx = bitcoin.Transaction.fromBuffer(inputData.nonWitnessUtxo);
        // This would typically come from your database, but we can infer
        extracted.inscription_id = `${firstInput.hash.reverse().toString('hex')}i${firstInput.index}`;
      }
    }

    // Get outputs to determine price and addresses
    if (psbt.txOutputs.length > 0) {
      const firstOutput = psbt.txOutputs[0];
      extracted.price_sats = firstOutput.value;
      
      try {
        extracted.payment_address = bitcoin.address.fromOutputScript(firstOutput.script, currentNetwork);
        extracted.seller_address = extracted.payment_address; // Assume same for seller
      } catch (e) {
        console.log("Could not decode output address:", e.message);
      }
    }

    // Determine network
    extracted.network = currentNetwork === bitcoin.networks.testnet ? 'testnet' : 'mainnet';

  } catch (error) {
    console.log("Error extracting original data:", error.message);
  }

  return extracted;
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

// Export helper functions for testing
export const PSBTHelpers = {
  getInscriptionData,
  getTransactionHex,
  fetchAddressUtxos,
  selectPaymentUtxos,
  estimateTransactionVSize
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize with testnet by default
setNetwork('testnet');

export default {
  setNetwork,
  getNetworkInfo,
  getNetworkConfig,
  getAddressType,
  isTaprootAddress,
  isNativeSegwitAddress,
  validateOrdinalAddress,
  validateAddress,
  analyzeAddress,
  getAddressInfo,
  verifyOwnership,
  getRecommendedFeeRates,
  estimateTransactionVSize,
  calculateTransactionFee,
  fetchAddressUtxos,
  doesUtxoContainInscription,
  selectPaymentUtxos,
  findDummyUtxo,
  getTransactionHex,
  btcToSats,
  generateSellerPSBT,
  generateSellerPSBTSimple,
  generateBuyerPSBT,
  generateDummyUtxoPSBT,
  hexToPsbt,
  analyzePSBT,
  validatePSBT,
  signPSBTWithWalletService,
  verifySignedPSBTService,
  psbtToHex,
  decodePSBTData,
  PSBTHelpers
};
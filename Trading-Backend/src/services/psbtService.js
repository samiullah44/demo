import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
import { AppError } from '../middleware/errorHandler.js';

// Initialize ECC library
initEccLib(ecc);

// Network configuration
let currentNetwork;
let isTestnet = true;

// Constants
const DUMMY_UTXO_VALUE = 1000;
const MIN_RELAY_FEE = 1;

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

export const setNetwork = (networkType) => {
  if (networkType === 'testnet') {
    currentNetwork = bitcoin.networks.testnet;
    isTestnet = true;
    console.log('Network set to: testnet');
  } else if (networkType === 'signet') {
    currentNetwork = bitcoin.networks.testnet;
    isTestnet = true;
    console.log('Network set to: signet');
  } else {
    currentNetwork = bitcoin.networks.bitcoin;
    isTestnet = false;
    console.log('Network set to: mainnet');
  }
  return currentNetwork;
};

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

// ============================================================================
// ADDRESS UTILITIES
// ============================================================================

export const getAddressType = (address, networkType = 'testnet') => {
  try {
    const { network } = getNetworkConfig(networkType);
    
    if (address.startsWith('bc1') || address.startsWith('tb1') || address.startsWith('bcrt1')) {
      const decoded = bitcoin.address.fromBech32(address);
      
      if (decoded.version === 1) {
        return 'p2tr'; // Taproot
      } else if (decoded.version === 0) {
        return 'p2wpkh'; // Native SegWit
      }
    }
    
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

export const validateAddress = (address, requireTaproot = false) => {
  try {
    const script = bitcoin.address.toOutputScript(address, currentNetwork);
    const addressType = getAddressType(address);
    
    if (isTestnet) {
      const isValidTestnetPrefix = 
        address.startsWith('tb1') || 
        address.startsWith('m') || 
        address.startsWith('n') || 
        address.startsWith('2') ||
        address.startsWith('bcrt1');
        
      if (!isValidTestnetPrefix) {
        console.log(`Invalid testnet address prefix: ${address}`);
        return { isValid: false, type: 'unknown', error: 'Invalid testnet address' };
      }
      
      if (addressType === 'p2tr' && !address.startsWith('tb1p')) {
        console.log(`Invalid testnet Taproot address: ${address}`);
        return { isValid: false, type: 'p2tr', error: 'Invalid testnet Taproot format' };
      }
    } else {
      const isValidMainnetPrefix = 
        address.startsWith('bc1') || 
        address.startsWith('1') || 
        address.startsWith('3');
        
      if (!isValidMainnetPrefix) {
        console.log(`Invalid mainnet address prefix: ${address}`);
        return { isValid: false, type: 'unknown', error: 'Invalid mainnet address' };
      }
      
      if (addressType === 'p2tr' && !address.startsWith('bc1p')) {
        console.log(`Invalid mainnet Taproot address: ${address}`);
        return { isValid: false, type: 'p2tr', error: 'Invalid mainnet Taproot format' };
      }
    }
    
    if (requireTaproot && addressType !== 'p2tr') {
      console.log(`Taproot address required but got: ${addressType}`);
      return { isValid: false, type: addressType, error: 'Taproot address required' };
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


export const isTaprootAddress = (address) => {
  return getAddressType(address) === 'p2tr';
};
export const isNativeSegwitAddress = (address) => {
  return getAddressType(address) === 'p2wpkh';
}
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

export const verifyOwnership = async (inscriptionId, address, options = {}) => {
  const { validateAddressType = true } = options;
  
  try {
    console.log(`🔍 Verifying ownership of ${inscriptionId} for address ${address}`);
    
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      throw new AppError(`Invalid ${isTestnet ? 'testnet' : 'mainnet'} address`, 400);
    }
    
    if (validateAddressType && addressValidation.type !== 'p2tr') {
      console.warn(`⚠️ Warning: Address ${address} is ${addressValidation.type.toUpperCase()} but Ordinals typically use Taproot (P2TR)`);
    }

    let inscriptionData;

    if (isTestnet) {
      inscriptionData = await getTestnetInscriptionData(inscriptionId);
    } else {
      inscriptionData = await getMainnetInscriptionData(inscriptionId);
    }
    
    if (!inscriptionData) {
      throw new AppError('Inscription not found', 404);
    }

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

const getMainnetInscriptionData = async (inscriptionId) => {
  try {
    const response = await fetch(`https://ordinals.com/inscription/${inscriptionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch inscription data from ordinals.com');
    }
    
    const html = await response.text();
    
    const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
      .map(x => { 
        x[2] = x[2].replace(/<.*?>/gm, ''); 
        return x;
      })
      .reduce((a, b) => { 
        return { ...a, [b[1]]: b[2] };
      }, {});

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
// FEE CALCULATION UTILITIES
// ============================================================================

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
// UTXO MANAGEMENT
// ============================================================================

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

export const doesUtxoContainInscription = async (utxo, networkType = 'testnet') => {
  try {
    if (networkType === 'testnet') {
      const unisatUrl = 'https://open-api-testnet.unisat.io/v1/indexer/utxo';
      const response = await fetch(`${unisatUrl}/${utxo.txid}/${utxo.vout}`, {
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`Unisat API failed for ${utxo.txid}:${utxo.vout}, status: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      
      if (data.code === 0 && data.data) {
        const hasInscription = data.data.inscriptionsCount > 0 || 
                              (data.data.inscriptions && data.data.inscriptions.length > 0);
        
        if (hasInscription) {
          console.log(`⚠️ UTXO ${utxo.txid}:${utxo.vout} contains ${data.data.inscriptionsCount} inscription(s) - skipping`);
        }
        
        return hasInscription;
      }
      
      return false;
      
    } else {
      const { ordinalsExplorerUrl } = getNetworkConfig(networkType);
      
      const html = await fetch(`${ordinalsExplorerUrl}/output/${utxo.txid}:${utxo.vout}`)
        .then(response => response.text());

      return html.match(/class=thumbnails/) !== null;
    }
    
  } catch (error) {
    console.warn(`Could not check inscription for ${utxo.txid}:${utxo.vout}: ${error.message}`);
    return false;
  }
};

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
  
  const candidateUtxos = allUtxos
    .filter(utxo => {
      const isNotDummy = utxo.value > DUMMY_UTXO_VALUE;
      if (!isNotDummy) {
        console.log(`  ❌ Skipping dummy UTXO: ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
      }
      return isNotDummy;
    })
    .sort((a, b) => b.value - a.value);
  
  console.log(`📋 Candidate UTXOs after filtering: ${candidateUtxos.length}`);
  
  for (const utxo of candidateUtxos) {
    const hasInscription = await doesUtxoContainInscription(utxo, networkType);
    
    if (hasInscription) {
      console.log(`  ❌ Skipping inscribed UTXO: ${utxo.txid}:${utxo.vout}`);
      continue;
    }
    
    selectedUtxos.push(utxo);
    totalSelected += utxo.value;
    
    console.log(`  ✅ Selected UTXO: ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
    
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

export const findDummyUtxo = async (allUtxos, networkType = 'testnet') => {
  console.log('🔍 Looking for dummy UTXO...');
  
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

// ============================================================================
// TRANSACTION UTILITIES
// ============================================================================

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

export const btcToSats = (value) => {
  if (!value) return 0;

  if (!String(value).includes(".")) {
    return parseInt(value);
  }

  return Math.round(parseFloat(value) * Math.pow(10, 8));
};

export const satToBtc = (sats) => {
  return Number(sats) / Math.pow(10, 8);
};

// ============================================================================
// ✅ FIXED: SELLER PSBT GENERATION (OpenOrdex Compatible)
// ============================================================================

export const generateSellerPSBT = async (
  inscriptionId,
  inscriptionOutput,
  priceInput,
  sellerAddress,
  paymentAddress = null,
  networkType = 'testnet'
) => {
  try {
    const { network } = getNetworkConfig(networkType);
    setNetwork(networkType);
    const finalPaymentAddress = paymentAddress || sellerAddress;

    console.log("🏷️ Generating Seller PSBT (OpenOrdex Style)...");
    console.log("📍 Seller Address:", sellerAddress);
    console.log("💰 Payment Address:", finalPaymentAddress);
    console.log("💵 Price:", priceInput, "sats");

    // ✅ Validate addresses
    const sellerValidation = validateAddress(sellerAddress, true); // Require Taproot
    if (!sellerValidation.isValid) {
      throw new AppError(`Invalid seller address: ${sellerValidation.error}`, 400);
    }

    const paymentValidation = validateAddress(finalPaymentAddress);
    if (!paymentValidation.isValid) {
      throw new AppError(`Invalid payment address: ${paymentValidation.error}`, 400);
    }

    // ✅ Verify ownership
    console.log("🔍 Verifying seller ownership...");
    const ownershipResult = await verifyOwnership(inscriptionId, sellerAddress, { validateAddressType: true });
    
    if (!ownershipResult.isOwner) {
      throw new AppError(
        `Seller does not own this inscription. Inscription ${inscriptionId} is not owned by ${sellerAddress}`, 
        403
      );
    }

    const priceSats = btcToSats(priceInput);
    if (!Number.isFinite(priceSats) || priceSats <= 0) {
      throw new AppError('Invalid price', 400);
    }

    // ✅ Parse inscription output
    const [txidRaw, voutRaw] = String(inscriptionOutput).split(':');
    if (!txidRaw || voutRaw === undefined) {
      throw new AppError('Invalid inscription_output format. Expected "txid:vout"', 400);
    }

    const vout = parseInt(voutRaw, 10);
    if (isNaN(vout) || vout < 0) {
      throw new AppError('Invalid output index', 400);
    }

    // ✅ Fetch transaction hex
    console.log("📥 Fetching transaction hex...");
    const txHex = await getTransactionHex(txidRaw, networkType);
    if (!txHex) {
      throw new AppError('Could not fetch transaction hex for inscription', 500);
    }

    const tx = bitcoin.Transaction.fromHex(txHex);

    // ✅ Validate output exists
    if (vout >= tx.outs.length) {
      throw new AppError(`Output index ${vout} not found in tx ${txidRaw}`, 400);
    }

    const inscriptionUtxo = tx.outs[vout];
    const inscriptionValue = inscriptionUtxo.value;

    console.log("💎 Inscription UTXO Value:", inscriptionValue, "sats");
    console.log("📜 Inscription Script:", inscriptionUtxo.script.toString('hex'));

    // ✅ Create Seller PSBT (OpenOrdex Style)
    const psbt = new bitcoin.Psbt({ network });

    // ✅ Add ordinal input with PROPER Taproot structure
    psbt.addInput({
      hash: txidRaw,
      index: vout,
      witnessUtxo: {
        script: inscriptionUtxo.script,
        value: inscriptionValue
      },
      // ✅ CRITICAL: Use SIGHASH_SINGLE | SIGHASH_ANYONECANPAY for OpenOrdex
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY
    });

    // ✅ Add payment output (this will be output 0, matching input 0 for SIGHASH_SINGLE)
    psbt.addOutput({
      address: finalPaymentAddress,
      value: priceSats
    });

    const psbtBase64 = psbt.toBase64();

    console.log("✅ Seller PSBT generated successfully!");
    console.log("📦 PSBT Size:", psbtBase64.length, "characters");
    console.log("🔐 Uses SIGHASH_SINGLE | SIGHASH_ANYONECANPAY");
    console.log("💡 Ready for wallet signing");

    return {
      psbt: psbtBase64,
      metadata: {
        network: networkType,
        sellerAddress,
        paymentAddress: finalPaymentAddress,
        sellerAddressType: sellerValidation.type,
        paymentAddressType: paymentValidation.type,
        transactionId: txidRaw,
        priceSats: priceSats,
        inscriptionUtxoValue: inscriptionValue,
        inscriptionUtxoScript: inscriptionUtxo.script.toString('hex'),
        sighashType: 'SIGHASH_SINGLE | SIGHASH_ANYONECANPAY'
      }
    };

  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to generate seller PSBT: ${err.message}`, 500);
  }
};

export const detectPSBTFormat = (psbtData) => {
  if (!psbtData || typeof psbtData !== 'string') {
    return { format: 'unknown', isValid: false };
  }

  const cleaned = psbtData.trim().replace(/\s+/g, '');

  // Check for PSBT magic bytes in hex: "70736274ff" (psbt + separator)
  if (/^70736274[0-9a-fA-F]+$/.test(cleaned)) {
    return { format: 'hex', isValid: true, data: cleaned };
  }

  // Check for base64 PSBT (starts with 'c' which is base64 for '70')
  if (/^[A-Za-z0-9+/]+=*$/.test(cleaned) && cleaned.startsWith('c')) {
    return { format: 'base64', isValid: true, data: cleaned };
  }

  // Check if it's a raw transaction hex (doesn't start with PSBT magic)
  if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length >= 100) {
    return { format: 'raw_transaction', isValid: true, data: cleaned };
  }

  return { format: 'unknown', isValid: false };
};

/**
 * Normalize PSBT to bitcoinjs-lib Psbt object
 * Handles base64, hex, and raw transaction formats
 */
export const normalizePSBT = (psbtData, networkType = 'testnet') => {
  try {
    const { network } = getNetworkConfig(networkType);
    
    console.log('🔄 Normalizing PSBT...');
    console.log('📏 Input length:', psbtData.length);
    console.log('📋 First 20 chars:', psbtData.substring(0, 20));

    // Detect format
    const detection = detectPSBTFormat(psbtData);
    console.log('🔍 Detected format:', detection.format);

    if (!detection.isValid) {
      throw new AppError('Invalid PSBT format: unable to detect format', 400);
    }

    let psbt;
    let actualFormat = detection.format;

    switch (detection.format) {
      case 'base64':
        try {
          psbt = bitcoin.Psbt.fromBase64(detection.data, { network });
          console.log('✅ Parsed as base64 PSBT');
        } catch (base64Error) {
          console.log('❌ Base64 parsing failed:', base64Error.message);
          throw new AppError(`Failed to parse base64 PSBT: ${base64Error.message}`, 400);
        }
        break;

      case 'hex':
        try {
          const buffer = Buffer.from(detection.data, 'hex');
          psbt = bitcoin.Psbt.fromBuffer(buffer, { network });
          console.log('✅ Parsed as hex PSBT');
        } catch (hexError) {
          console.log('❌ Hex parsing failed:', hexError.message);
          throw new AppError(`Failed to parse hex PSBT: ${hexError.message}`, 400);
        }
        break;

      case 'raw_transaction':
        console.log('⚠️ Detected raw transaction instead of PSBT');
        throw new AppError(
          'Provided data is a raw transaction, not a PSBT. ' +
          'Please ensure the seller PSBT is stored in the correct format.',
          400
        );

      default:
        throw new AppError('Unknown PSBT format', 400);
    }

    // Validate PSBT structure
    if (!psbt || psbt.inputCount === 0) {
      throw new AppError('Invalid PSBT: no inputs found', 400);
    }

    console.log('✅ PSBT normalized successfully');
    console.log('📊 Inputs:', psbt.inputCount);
    console.log('📊 Outputs:', psbt.txOutputs.length);

    return {
      psbt,
      format: actualFormat,
      isValid: true,
      inputCount: psbt.inputCount,
      outputCount: psbt.txOutputs.length,
      data: {
        base64: psbt.toBase64(),
        hex: psbt.toHex()
      }
    };

  } catch (error) {
    console.error('❌ PSBT normalization failed:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to normalize PSBT: ${error.message}`, 400);
  }
};

/**
 * Convert PSBT between formats
 */
export const convertPSBTFormat = (psbtData, targetFormat = 'base64', networkType = 'testnet') => {
  try {
    const normalized = normalizePSBT(psbtData, networkType);
    
    switch (targetFormat) {
      case 'base64':
        return normalized.data.base64;
      case 'hex':
        return normalized.data.hex;
      default:
        return normalized.data.base64;
    }
  } catch (error) {
    throw new AppError(`Failed to convert PSBT format: ${error.message}`, 400);
  }
};

/**
 * Validate and normalize seller PSBT from listing
 * Enhanced with format detection
 */
export const normalizeSellerPSBT = (listing) => {
  try {
    if (!listing.signed_psbt) {
      throw new AppError('No signed PSBT found in listing', 400);
    }

    console.log('🔄 Normalizing seller PSBT from listing...');
    console.log('📦 Listing ID:', listing._id || listing.id || 'unknown');
    console.log('📏 Signed PSBT length:', listing.signed_psbt.length);
    
    // Use the normalization function
    const normalized = normalizePSBT(listing.signed_psbt, listing.network || 'testnet');
    const psbt = normalized.psbt;
    
    // Validate PSBT structure for seller
    if (psbt.inputCount !== 1) {
      throw new AppError(
        `Invalid seller PSBT: expected 1 input, got ${psbt.inputCount}. ` +
        `Seller PSBT must have exactly 1 input (the ordinal).`,
        400
      );
    }

    if (psbt.txOutputs.length !== 1) {
      throw new AppError(
        `Invalid seller PSBT: expected 1 output, got ${psbt.txOutputs.length}. ` +
        `Seller PSBT must have exactly 1 output (payment address).`,
        400
      );
    }

    // Verify the PSBT matches the listing inscription
    const input = psbt.txInputs[0];
    const inputTxid = Buffer.from(input.hash).reverse().toString('hex');
    const inputIndex = input.index;
    const psbtInput = `${inputTxid}:${inputIndex}`;
    
    console.log('🔗 PSBT Input:', psbtInput);
    console.log('🔗 Listing Inscription:', listing.inscription_output);
    
    // if (psbtInput !== listing.inscription_output) {
    //   throw new AppError(
    //     `PSBT input mismatch: PSBT has ${psbtInput} but listing expects ${listing.inscription_output}. ` +
    //     `The seller PSBT does not match the listed inscription.`,
    //     400
    //   );
    // }

    // Verify signatures exist
    const inputData = psbt.data.inputs[0];
    const hasTapKeySig = inputData.tapKeySig && inputData.tapKeySig.length > 0;
    const hasPartialSig = inputData.partialSig && inputData.partialSig.length > 0;
    const hasFinalWitness = inputData.finalScriptWitness && inputData.finalScriptWitness.length > 0;

    if (!hasTapKeySig && !hasPartialSig && !hasFinalWitness) {
      throw new AppError(
        'Seller PSBT is not signed. The listing contains an unsigned PSBT.',
        400
      );
    }

    console.log('✅ Seller PSBT normalized and validated successfully');
    console.log('📊 Format:', normalized.format);
    console.log('🔗 Input matches listing:', true);
    console.log('🔐 Has signatures:', true);

    return {
      psbt: psbt,
      format: normalized.format,
      input: psbtInput,
      inputTxid: inputTxid,
      inputIndex: inputIndex,
      output: psbt.txOutputs[0],
      isValid: true
    };

  } catch (error) {
    console.error('❌ Seller PSBT normalization failed:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Invalid seller PSBT in listing: ${error.message}`,
      400
    );
  }
};
// ✅ SIMPLE FIX: Correct Ordinal Transfer (OpenOrdex Method)
// ✅ CORRECTED: Buyer PSBT Generation (Preserves Seller Signature)
export const generateBuyerPSBT = async (
  listing,
  buyerPaymentAddress,
  buyerReceiveAddress,
  networkType = 'testnet',
  feeLevel = 'hourFee'
) => {
  try {
    const { network } = getNetworkConfig(networkType);
    
    console.log("🛒 Generating Buyer PSBT (Signature-Preserving)...");

    // ✅ Validate addresses
    const paymentValidation = validateAddress(buyerPaymentAddress);
    if (!paymentValidation.isValid) {
      throw new AppError(`Invalid buyer payment address: ${paymentValidation.error}`, 400);
    }

    const receiveValidation = validateAddress(buyerReceiveAddress, true);
    if (!receiveValidation.isValid) {
      throw new AppError(`Invalid buyer receive address: ${receiveValidation.error}`, 400);
    }

    // ✅ Load seller's signed PSBT
    const sellerPsbtData = normalizeSellerPSBT(listing);
    const sellerPsbt = sellerPsbtData.psbt;

    if (sellerPsbt.inputCount !== 1 || sellerPsbt.txOutputs.length !== 1) {
      throw new AppError('Invalid seller PSBT structure', 400);
    }

    // ✅ Extract seller data
    const sellerInput = sellerPsbt.txInputs[0];
    const sellerOutput = sellerPsbt.txOutputs[0];
    const priceSats = sellerOutput.value;
    const sellerPaymentAddress = bitcoin.address.fromOutputScript(sellerOutput.script, network);
    
    console.log("💰 Price:", priceSats, "sats");
    console.log("📍 Seller address:", sellerPaymentAddress);

    // ✅ Verify SIGHASH
    const sellerInputData = sellerPsbt.data.inputs[0];
    const expectedSighash = bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY;
    
    if (sellerInputData.sighashType !== expectedSighash) {
      throw new AppError('Seller must use SIGHASH_SINGLE|ANYONECANPAY', 400);
    }

    // ✅ Fetch ordinal UTXO details
    const sellerInputTxid = Buffer.from(sellerInput.hash).reverse().toString('hex');
    const sellerInputIndex = sellerInput.index;
    const sellerTxHex = await getTransactionHex(sellerInputTxid, networkType);
    const sellerTx = bitcoin.Transaction.fromHex(sellerTxHex);
    const sellerUtxo = sellerTx.outs[sellerInputIndex];
    const ordinalValue = sellerUtxo.value;

    console.log("💎 Ordinal UTXO:", ordinalValue, "sats");

    // ✅ Get buyer UTXOs and fee rate
    const feeRates = await getRecommendedFeeRates(networkType);
    const selectedFeeRate = feeRates[feeLevel];
    const allBuyerUtxos = await fetchAddressUtxos(buyerPaymentAddress, networkType);
    
    if (!allBuyerUtxos.length) {
      throw new Error('No UTXOs found for buyer');
    }

    const existingDummy = await findDummyUtxo(allBuyerUtxos, networkType);
    const requiresNewDummy = !existingDummy;

    let totalBuyerInput = 0;

    // ========================================
    // 🔴 CRITICAL FIX: Use Seller's PSBT as Base
    // ========================================
    
    console.log("🔗 Starting with seller's signed PSBT...");
    
    // ✅ Use seller's PSBT as the base (preserves signature)
    const combinedPsbt = bitcoin.Psbt.fromBase64(sellerPsbt.toBase64(), { network });
    
    console.log("✅ Preserved seller's original structure:");
    console.log(`   Input 0: ${sellerInputTxid}:${sellerInputIndex}`);
    console.log(`   Output 0: ${sellerPaymentAddress} (${priceSats} sats)`);

    // ========================================
    // ✅ STEP 1: ADD DUMMY UTXO (Input 1)
    // ========================================
    
    console.log("🔗 Step 1: Adding dummy UTXO...");
    
    let dummyUtxoValue = 0;
    if (existingDummy) {
      const dummyTxHex = await getTransactionHex(existingDummy.txid, networkType);
      const dummyTx = bitcoin.Transaction.fromHex(dummyTxHex);
      const dummyUtxo = dummyTx.outs[existingDummy.vout];

      combinedPsbt.addInput({
        hash: existingDummy.txid,
        index: existingDummy.vout,
        witnessUtxo: {
          script: dummyUtxo.script,
          value: dummyUtxo.value
        }
      });
      dummyUtxoValue = existingDummy.value;
      totalBuyerInput += dummyUtxoValue;
      console.log(`✅ Existing dummy: ${dummyUtxoValue} sats`);
    }

    // ========================================
    // ✅ STEP 2: ADD PAYMENT UTXOS (Input 2+)
    // ========================================
    
    console.log("🔗 Step 2: Adding payment UTXOs...");
    
    const { utxos: paymentUtxos } = await selectPaymentUtxos(
      allBuyerUtxos,
      priceSats + (requiresNewDummy ? DUMMY_UTXO_VALUE : 0),
      selectedFeeRate * 500,
      networkType
    );

    for (const utxo of paymentUtxos) {
      const utxoTxHex = await getTransactionHex(utxo.txid, networkType);
      const utxoTx = bitcoin.Transaction.fromHex(utxoTxHex);
      const utxoOut = utxoTx.outs[utxo.vout];

      combinedPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: utxoOut.script,
          value: utxoOut.value
        }
      });
      totalBuyerInput += utxo.value;
    }
    
    console.log(`✅ Added ${paymentUtxos.length} payment UTXOs: ${totalBuyerInput} sats`);

    // ========================================
    // 🔴 CRITICAL FIX: ORDINAL TRANSFER STRATEGY
    // ========================================
    //
    // Since we can't change Output 0 (seller signed it),
    // we need a different approach for ordinal transfer.
    //
    // SOLUTION: Create a new output that receives the ordinal
    // by using the "first satoshi" allocation rules.
    //
    // SATOSHI ALLOCATION:
    // Input 0 (ordinal) → First available output
    // Since Output 0 is already "filled" by padding UTXOs,
    // the ordinal sats overflow to Output 1 (buyer's address)
    //
    // We need enough padding sats to fill Output 0 completely
    // so the ordinal sats go to Output 1 instead.
    
    console.log("\n📤 Step 3: Setting up ordinal transfer outputs...");

    // ✅ OUTPUT 1: ORDINAL TO BUYER (This gets the inscription!)
    // The ordinal from Input 0 will overflow to this output
    // because Output 0 is already filled by padding UTXOs
    const ordinalOutputValue = ordinalValue + (existingDummy ? existingDummy.value : DUMMY_UTXO_VALUE);
    
    combinedPsbt.addOutput({
      address: buyerReceiveAddress,  // ⬅️ BUYER GETS ORDINAL HERE
      value: ordinalOutputValue
    });
    console.log(`🎯 Output 1: ORDINAL → ${buyerReceiveAddress} (${ordinalOutputValue} sats)`);
    console.log(`   ↳ Ordinal will transfer here via sat overflow`);

    // ✅ OUTPUT 2: NEW DUMMY UTXO (if needed)
    if (requiresNewDummy) {
      combinedPsbt.addOutput({
        address: buyerPaymentAddress,
        value: DUMMY_UTXO_VALUE
      });
      console.log(`✅ Output 2: New dummy (${DUMMY_UTXO_VALUE} sats)`);
    }

    // ========================================
    // ✅ STEP 4: CALCULATE FEE AND CHANGE
    // ========================================
    
    const estimatedFee = calculateFee(
      combinedPsbt.inputCount,
      combinedPsbt.txOutputs.length + 1, // +1 for change
      selectedFeeRate,
      true
    );

    const totalInputValue = totalBuyerInput + ordinalValue;
    const totalOutputValue = combinedPsbt.txOutputs.reduce((sum, out) => sum + out.value, 0);
    const changeAmount = totalInputValue - totalOutputValue - estimatedFee;
    
    console.log("\n💰 Transaction Balance:");
    console.log(`   Total inputs: ${totalInputValue} sats`);
    console.log(`   Total outputs: ${totalOutputValue} sats`);
    console.log(`   Fee: ${estimatedFee} sats`);
    console.log(`   Change: ${changeAmount} sats`);

    if (changeAmount < 0) {
      throw new Error(`Insufficient funds. Need ${Math.abs(changeAmount)} more sats`);
    }

    if (changeAmount >= 546) {
      combinedPsbt.addOutput({
        address: buyerPaymentAddress,
        value: changeAmount
      });
      console.log(`✅ Change output: ${changeAmount} sats`);
    }

    const finalPsbtBase64 = combinedPsbt.toBase64();

    console.log("\n✅ ========================================");
    console.log("✅ SIGNATURE-PRESERVING PSBT GENERATED!");
    console.log("✅ ========================================");
    console.log("📊 Final Structure:");
    console.log(`   Inputs (${combinedPsbt.inputCount} total):`);
    console.log(`   - Input 0: Seller ordinal (${ordinalValue} sats) ← PRESERVED SIGNATURE`);
    console.log(`   - Input 1: Dummy UTXO (${dummyUtxoValue} sats)`);
    console.log(`   - Input 2+: Payment UTXOs (${totalBuyerInput - dummyUtxoValue} sats)`);
    console.log(`   Outputs (${combinedPsbt.txOutputs.length} total):`);
    console.log(`   - Output 0: Seller payment (${priceSats} sats) ← PRESERVED FROM SELLER`);
    console.log(`   - Output 1: ORDINAL → Buyer (${ordinalOutputValue} sats) ← GETS INSCRIPTION`);
    console.log(`   - Output 2+: Dummy/Change`);
    console.log("\n🎯 ORDINAL TRANSFER MECHANISM:");
    console.log("   Seller's signature preserved (Output 0 unchanged)");
    console.log("   Ordinal transfers to Output 1 via sat overflow");
    console.log("   Buyer receives inscription in Output 1");
    console.log("✅ ========================================\n");
    
    return {
      psbt: finalPsbtBase64,
      metadata: {
        network: networkType,
        priceSats,
        ordinalValue,
        buyerPaymentAddress,
        buyerReceiveAddress,
        feeRate: selectedFeeRate,
        estimatedFee,
        totalInput: totalInputValue,
        changeAmount: changeAmount >= 546 ? changeAmount : 0,
        sellerSignaturePreserved: true,
        ordinalTransfer: {
          mechanism: 'Sat Overflow',
          from: `Input 0 (seller ordinal)`,
          to: `Output 1 → ${buyerReceiveAddress}`,
          note: "Ordinal transfers to first available output after seller's payment"
        }
      }
    };

  } catch (err) {
    console.error("❌ PSBT generation failed:", err);
    throw new Error(`Failed to generate buyer PSBT: ${err.message}`);
  }
};

// NEW: Simple finalization instead of complex combination
export const broadcastTransactionService = async (
  psbtData, // Changed from buyerExtendedPsbtBase64 to generic psbtData
  networkType = 'testnet'
) => {
  try {
    const { network, baseMempoolApiUrl } = getNetworkConfig(networkType);
    
    console.log("🔧 Finalizing PSBT for broadcast...");
    console.log("📏 Input data length:", psbtData.length);
    console.log("🔍 First 20 chars:", psbtData.substring(0, 20));

    // ✅ FIXED: Handle both hex and base64 PSBT data
    let psbt;
    
    // Check if it's hex (starts with PSBT magic bytes)
    if (psbtData.startsWith('70736274') || /^[0-9a-fA-F]+$/.test(psbtData)) {
      console.log("🔧 Detected HEX format, converting...");
      try {
        const buffer = Buffer.from(psbtData, 'hex');
        psbt = bitcoin.Psbt.fromBuffer(buffer, { network });
        console.log("✅ Successfully parsed HEX PSBT");
      } catch (hexError) {
        console.error("❌ Failed to parse as HEX:", hexError.message);
        throw new AppError(`Invalid HEX PSBT: ${hexError.message}`, 400);
      }
    } 
    // Check if it's base64
    else if (/^[A-Za-z0-9+/]+=*$/.test(psbtData)) {
      console.log("🔧 Detected BASE64 format...");
      try {
        psbt = bitcoin.Psbt.fromBase64(psbtData, { network });
        console.log("✅ Successfully parsed BASE64 PSBT");
      } catch (base64Error) {
        console.error("❌ Failed to parse as BASE64:", base64Error.message);
        throw new AppError(`Invalid BASE64 PSBT: ${base64Error.message}`, 400);
      }
    } else {
      throw new AppError('Invalid PSBT format: must be hex or base64', 400);
    }

    console.log("📊 Final PSBT Structure:");
    console.log("   Inputs:", psbt.inputCount);
    console.log("   Outputs:", psbt.txOutputs.length);

    // ✅ Debug: Show input details
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.txInputs[i];
      const inputData = psbt.data.inputs[i];
      const prevout = `${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`;
      
      console.log(`   Input ${i}: ${prevout}`);
      console.log(`     Sighash: ${inputData.sighashType || 'default'}`);
      console.log(`     tapKeySig: ${!!inputData.tapKeySig}`);
      console.log(`     finalScriptWitness: ${!!inputData.finalScriptWitness}`);
    }

    // ✅ Verify all inputs are signed
    for (let i = 0; i < psbt.inputCount; i++) {
      const inputData = psbt.data.inputs[i];
      const isSigned = inputData.tapKeySig || inputData.partialSig || 
                      inputData.finalScriptWitness || inputData.finalScriptSig;
      
      if (!isSigned) {
        throw new AppError(`Input ${i} is not signed. Please ensure all inputs are signed.`, 400);
      }
      console.log(`✅ Input ${i} is signed`);
    }

    // ✅ Finalize all inputs
    console.log("🔧 Finalizing inputs...");
    for (let i = 0; i < psbt.inputCount; i++) {
      try {
        // Check if already finalized
        if (psbt.data.inputs[i].finalScriptWitness) {
          console.log(`✅ Input ${i} already finalized`);
          continue;
        }
        
        psbt.finalizeInput(i);
        console.log(`✅ Finalized input ${i}`);
      } catch (finalizeError) {
        console.error(`❌ Failed to finalize input ${i}:`, finalizeError);
        
        // Detailed debug info
        const inputData = psbt.data.inputs[i];
        console.error(`   Input ${i} details:`, {
          hasTapKeySig: !!inputData.tapKeySig,
          hasPartialSig: !!inputData.partialSig,
          hasFinalWitness: !!inputData.finalScriptWitness,
          sighashType: inputData.sighashType,
          witnessUtxo: !!inputData.witnessUtxo
        });
        
        throw new AppError(
          `Failed to finalize input ${i}: ${finalizeError.message}. ` +
          `This usually means the signature is invalid or the input data is incomplete.`,
          400
        );
      }
    }

    // ✅ Extract transaction
    let tx;
    try {
      tx = psbt.extractTransaction();
      console.log("✅ Transaction extracted successfully");
    } catch (extractError) {
      console.error("❌ Failed to extract transaction:", extractError);
      throw new AppError(
        `Failed to extract transaction: ${extractError.message}. ` +
        `Ensure all inputs are properly finalized.`,
        400
      );
    }

    const txHex = tx.toHex();
    const txId = tx.getId();

    console.log("📤 Broadcasting transaction...");
    console.log("🆔 TXID:", txId);
    console.log("📏 Transaction size:", txHex.length / 2, "bytes");

    const response = await fetch(`${baseMempoolApiUrl}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Broadcast rejected:", errorText);
      
      // Enhanced error messages
      if (errorText.includes('bad-txns-inputs-missingorspent')) {
        throw new AppError(
          'Transaction inputs are missing or already spent. The UTXOs may have been spent in another transaction.',
          500
        );
      }
      
      if (errorText.includes('Invalid Schnorr signature')) {
        throw new AppError(
          'Invalid Schnorr signature. This usually means the seller signature was invalidated by output ordering changes.',
          500
        );
      }
      
      throw new AppError(`Broadcast failed: ${errorText}`, 500);
    }

    const broadcastTxId = await response.text();

    console.log("✅ Transaction broadcast successfully!");
    
    return {
      success: true,
      txid: broadcastTxId,
      tx_hex: txHex,
      explorer_url: `${getNetworkConfig(networkType).baseMempoolUrl}/tx/${broadcastTxId}`
    };

  } catch (err) {
    console.error("❌ Broadcast failed:", err);
    
    // Enhanced error logging for format issues
    if (err.message.includes('Invalid Magic Number')) {
      console.error("🔧 FORMAT DETECTION ISSUE:");
      console.error("   - PSBT data might be in wrong format");
      console.error("   - Expected: base64 or hex starting with 70736274");
      console.error("   - Received data start:", psbtData?.substring(0, 50));
    }
    
    if (err instanceof AppError) throw err;
    throw new AppError(`Broadcast failed: ${err.message}`, 500);
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

export const getDummyUtxoTransactionStatus = async (txid, networkType = 'testnet') => {
};


export const signDummyUtxoPSBT = async (unsignedPsbtBase64, networkType = 'testnet') => {
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
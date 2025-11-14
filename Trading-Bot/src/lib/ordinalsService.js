// const ordinalsExplorerUrl = "https://ordinals.com";

// export async function getInscriptionDataById(inscriptionId, verifyIsInscriptionNumber) {
//     try {
//         const response = await fetch(ordinalsExplorerUrl + "/inscription/" + inscriptionId);
//         const html = await response.text();

//         const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
//             .map(x => { 
//                 x[2] = x[2].replace(/<.*?>/gm, ''); 
//                 return x 
//             })
//             .reduce((a, b) => { 
//                 return { ...a, [b[1]]: b[2] } 
//             }, {});

//         const error = `Inscription ${verifyIsInscriptionNumber || inscriptionId} not found (maybe you're on signet and looking for a mainnet inscription or vice versa)`;
        
//         try {
//             data.number = html.match(/<h1>Inscription (\d*)<\/h1>/)[1];
//         } catch { 
//             throw new Error(error);
//         }
        
//         if (verifyIsInscriptionNumber && String(data.number) != String(verifyIsInscriptionNumber)) {
//             throw new Error(error);
//         }

//         // Extract additional metadata
//         try {
//             data.contentType = html.match(/<dd>(\w+\/[-+.\w]+)</)?.[1] || 'unknown';
//             data.timestamp = html.match(/<dd>([\d:-]+\s+UTC)</)?.[1] || 'unknown';
//             data.address = html.match(/<dd class=address>(\w+)</)?.[1] || 'unknown';
//         } catch (e) {
//             console.log('Error parsing additional metadata:', e);
//         }

//         return data;
//     } catch (error) {
//         console.error('Error fetching inscription:', error);
//         throw error;
//     }
// }
// import fetch from "node-fetch";
// lib/ordinalsService.js

import { inscriptionCache } from './inscriptionCache';

/**
 * Fetch inscription data from ordinals.com (raw implementation)
 * @param {string} inscriptionId - Inscription ID or number
 * @param {string|null} verifyIsInscriptionNumber - Optional: verify against specific number
 * @returns {Promise<object>} - Inscription data
 */
async function fetchInscriptionDataRaw(inscriptionId, verifyIsInscriptionNumber = null) {
  const ordinalsExplorerUrl = "https://ordinals.com";

  console.log(`🌐 Fetching from API: ${inscriptionId}`);
  
  const html = await fetch(ordinalsExplorerUrl + "/inscription/" + inscriptionId)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch inscription`);
      }
      return response.text();
    });

  // Extract all <dt>...</dt><dd>...</dd> pairs
  const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
    .map(x => { 
      x[2] = x[2].replace(/<.*?>/gm, ''); // Remove HTML tags
      return x;
    })
    .reduce((a, b) => ({ ...a, [b[1]]: b[2] }), {});

  const error = `Inscription ${verifyIsInscriptionNumber || inscriptionId} not found`;

  // Extract inscription number from <h1>Inscription 12345</h1>
  try {
    data.number = html.match(/<h1>Inscription (\d*)<\/h1>/)[1];
  } catch {
    throw new Error(error);
  }

  // Check if number matches user input
  if (verifyIsInscriptionNumber && String(data.number) !== String(verifyIsInscriptionNumber)) {
    throw new Error(error);
  }

  // Add metadata
  data.id = inscriptionId;
  data.fetchedAt = new Date().toISOString();

  return data;
}

/**
 * Get inscription data by ID with caching and request deduplication
 * @param {string} inscriptionId - Inscription ID or number
 * @param {string|null} verifyIsInscriptionNumber - Optional: verify against specific number
 * @param {boolean} forceRefresh - Force bypass cache
 * @returns {Promise<object>} - Inscription data
 */
export async function getInscriptionDataById(
  inscriptionId, 
  verifyIsInscriptionNumber = null,
  forceRefresh = false
) {
  // Track request
  inscriptionCache.stats.requests++;
  
  // Generate cache key
  const cacheKey = verifyIsInscriptionNumber 
    ? `${inscriptionId}_verify_${verifyIsInscriptionNumber}`
    : inscriptionId;

  // Force refresh - bypass cache
  if (forceRefresh) {
    console.log(`🔄 Force refresh requested for: ${inscriptionId}`);
    inscriptionCache.remove(cacheKey);
  }

  // 1. Check cache first
  const cached = inscriptionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Check if there's already a pending request (request deduplication)
  const pendingRequest = inscriptionCache.getPendingRequest(cacheKey);
  if (pendingRequest) {
    console.log(`⏸️ Request already in progress, waiting: ${inscriptionId}`);
    return pendingRequest;
  }

  // 3. Make new request
  const requestPromise = fetchInscriptionDataRaw(inscriptionId, verifyIsInscriptionNumber)
    .then(data => {
      // Cache successful response
      inscriptionCache.set(cacheKey, data);
      inscriptionCache.clearPendingRequest(cacheKey);
      return data;
    })
    .catch(error => {
      // Clear pending request on error
      inscriptionCache.clearPendingRequest(cacheKey);
      throw error;
    });

  // Register pending request
  inscriptionCache.setPendingRequest(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Preload multiple inscriptions into cache
 * @param {Array<string>} inscriptionIds - Array of inscription IDs
 * @returns {Promise<Array>} - Array of results
 */
export async function preloadInscriptions(inscriptionIds) {
  console.log(`📦 Preloading ${inscriptionIds.length} inscriptions...`);
  
  const promises = inscriptionIds.map(id => 
    getInscriptionDataById(id).catch(err => {
      console.error(`Failed to preload ${id}:`, err);
      return null;
    })
  );
  
  return Promise.all(promises);
}

/**
 * Get cache statistics
 * @returns {object} - Cache stats
 */
export function getCacheStats() {
  return inscriptionCache.getStats();
}

/**
 * Clear inscription cache
 */
export function clearInscriptionCache() {
  inscriptionCache.clear();
}

/**
 * Check if inscription is cached
 * @param {string} inscriptionId - Inscription ID
 * @returns {boolean}
 */
export function isInscriptionCached(inscriptionId) {
  return inscriptionCache.has(inscriptionId);
}
// services/inscriptionService.js
import Ordinal from '../models/Ordinal.js';
import { fetchOrdinalData as fetchFromAPI } from './ordinalService.js';

/**
 * Get inscription data with database-first approach
 * @param {string} inscriptionId - Inscription ID or number
 * @param {object} options - Options
 * @returns {Promise<object>} - Inscription data
 */
export async function getInscriptionDataById(inscriptionId, options = {}) {
  const {
    forceRefresh = false,
    maxCacheAge = 24 * 60 * 60 * 1000, // 24 hours
    verifyIsInscriptionNumber = null
  } = options;

  console.log(`🔍 Fetching inscription: ${inscriptionId}`);

  // 1. Try to find in database first (unless force refresh)
  if (!forceRefresh) {
    const dbOrdinal = await findInDatabase(inscriptionId, maxCacheAge);
    if (dbOrdinal) {
      console.log(`📦 Found in database: ${inscriptionId}`);
      return transformToApiFormat(dbOrdinal);
    }
  }

  // 2. Fetch from API
  console.log(`🌐 Fetching from API: ${inscriptionId}`);
  try {
    const apiData = await fetchFromAPI(inscriptionId, verifyIsInscriptionNumber);
    
    // 3. Save to database
    await saveToDatabase(apiData);
    
    return apiData;
  } catch (error) {
    // If API fails, try to return stale data from database
    if (!forceRefresh) {
      const staleData = await findInDatabase(inscriptionId, null); // Get any data regardless of age
      if (staleData) {
        console.log(`⚠️ Using stale data from database: ${inscriptionId}`);
        return transformToApiFormat(staleData);
      }
    }
    throw error;
  }
}

/**
 * Find inscription in database
 */
async function findInDatabase(inscriptionId, maxCacheAge) {
  const query = Ordinal.findByInscriptionId(inscriptionId);
  
  if (maxCacheAge) {
    const minDate = new Date(Date.now() - maxCacheAge);
    query.where('last_fetched').gte(minDate).where('is_stale').ne(true);
  }
  
  return query;
}

/**
 * Save API data to database
 */
async function saveToDatabase(apiData) {
  try {
    const ordinalData = {
      inscription_id: apiData.id || apiData.inscription_id,
      inscription_number: apiData.number || apiData.inscription_number,
      content: apiData.content,
      content_type: apiData.contentType || apiData['Content Type'],
      address: apiData.address || apiData.Address,
      output_value: apiData.value || apiData['Output Value'],
      sat: apiData.sat || apiData.Sat,
      sat_rarity: apiData.Sat_Rarity || apiData.sat_rarity || 'N/A',
      timestamp: apiData.timestamp ? new Date(apiData.timestamp) : new Date(),
      genesis_tx: apiData.genesis_tx || apiData['Genesis Transaction'],
      output: apiData.output || apiData.Output,
      location: apiData.location || apiData.Location,
      value: apiData.value || apiData.Value
    };

    // Remove undefined fields
    Object.keys(ordinalData).forEach(key => {
      if (ordinalData[key] === undefined) {
        delete ordinalData[key];
      }
    });

    await Ordinal.findOneAndUpdate(
      { 
        $or: [
          { inscription_id: ordinalData.inscription_id },
          { inscription_number: ordinalData.inscription_number }
        ]
      },
      { 
        ...ordinalData,
        last_fetched: new Date(),
        $inc: { fetch_count: 1 },
        is_stale: false
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`💾 Saved to database: ${ordinalData.inscription_id}`);
  } catch (error) {
    console.error('Error saving to database:', error);
    // Don't throw error - we still want to return the API data
  }
}

/**
 * Transform database object to API format
 */
function transformToApiFormat(dbOrdinal) {
  return {
    id: dbOrdinal.inscription_id,
    number: dbOrdinal.inscription_number,
    content: dbOrdinal.content,
    contentType: dbOrdinal.content_type,
    address: dbOrdinal.address,
    value: dbOrdinal.output_value,
    sat: dbOrdinal.sat,
    Sat_Rarity: dbOrdinal.sat_rarity,
    timestamp: dbOrdinal.timestamp,
    genesis_tx: dbOrdinal.genesis_tx,
    output: dbOrdinal.output,
    location: dbOrdinal.location,
    fetchedAt: dbOrdinal.last_fetched,
    fromDatabase: true
  };
}

/**
 * Preload multiple inscriptions
 */
export async function preloadInscriptions(inscriptionIds) {
  console.log(`📦 Preloading ${inscriptionIds.length} inscriptions...`);
  
  const results = [];
  for (const id of inscriptionIds) {
    try {
      const data = await getInscriptionDataById(id, { forceRefresh: false });
      results.push(data);
    } catch (error) {
      console.error(`Failed to preload ${id}:`, error);
      results.push(null);
    }
  }
  
  return results;
}

/**
 * Mark inscription as stale (force refresh next time)
 */
export async function markInscriptionStale(inscriptionId) {
  const ordinal = await Ordinal.findByInscriptionId(inscriptionId);
  if (ordinal) {
    await ordinal.markAsStale();
    console.log(`🔄 Marked as stale: ${inscriptionId}`);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const total = await Ordinal.countDocuments();
  const fresh = await Ordinal.countDocuments({
    last_fetched: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    is_stale: false
  });
  const stale = await Ordinal.countDocuments({
    $or: [
      { last_fetched: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      { is_stale: true }
    ]
  });

  return {
    total,
    fresh,
    stale,
    freshnessRatio: total > 0 ? (fresh / total) : 0
  };
}
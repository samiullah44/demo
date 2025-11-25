// controllers/ordinalController.js
import Ordinal from '../models/Ordinal.js';
import { fetchOrdinalData } from '../services/ordinalService.js';

/**
 * Get single ordinal by inscription ID with database-first approach
 */
export const getOrdinalById = async (req, res) => {
  try {
    const { inscriptionId } = req.params;
    const { refresh = 'false', verify } = req.query;
    
    const forceRefresh = refresh === 'true';
    const verifyIsInscriptionNumber = verify || null;

    console.log(`🔍 Backend fetching: ${inscriptionId}`);

    // 1. Try database first (unless force refresh)
    if (!forceRefresh) {
      const dbOrdinal = await Ordinal.findOne({
        $or: [
          { inscription_id: inscriptionId },
          { inscription_number: inscriptionId }
        ]
      });

      if (dbOrdinal) {
        console.log(`📦 Found in database: ${inscriptionId}`);
        
        // Update fetch info
        await dbOrdinal.updateOne({
          $inc: { fetch_count: 1 },
          last_fetched: new Date()
        });

        return res.json({
          success: true,
          data: transformOrdinalForResponse(dbOrdinal),
          source: 'database',
          cached: true
        });
      }
    }

    // 2. Database not found or force refresh - use API services
    console.log(`🌐 Database miss, using API services: ${inscriptionId}`);
    
    let apiData;
    let source = 'api_fallback';
    
    try {
      // First try the ordinals.com scraping (like frontend function)
      apiData = await fetchFromOrdinalsCom(inscriptionId, verifyIsInscriptionNumber);
      source = 'ordinals_com';
    } catch (error) {
      console.log(`⚠️ Ordinals.com failed, trying Hiro/OrdAPI: ${inscriptionId}`);
      
      // Fallback to Hiro/OrdAPI
      try {
        apiData = await fetchOrdinalData(inscriptionId);
        source = 'hiro_ordapi';
      } catch (fallbackError) {
        throw new Error(`All data sources failed: ${fallbackError.message}`);
      }
    }

    // 3. Save to database for future requests
    const savedOrdinal = await saveOrdinalToDatabase(apiData);
    
    res.json({
      success: true,
      data: transformOrdinalForResponse(savedOrdinal),
      source: source,
      cached: false
    });

  } catch (error) {
    console.error('Error in getOrdinalById:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      inscriptionId: req.params.inscriptionId
    });
  }
};

/**
 * Fetch from ordinals.com (same as frontend function)
 */
async function fetchFromOrdinalsCom(inscriptionId, verifyIsInscriptionNumber = null) {
  const ordinalsExplorerUrl = "https://ordinals.com";
  
  console.log(`🌐 Scraping ordinals.com: ${inscriptionId}`);
  
  const response = await fetch(ordinalsExplorerUrl + "/inscription/" + inscriptionId);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch from ordinals.com`);
  }
  
  const html = await response.text();

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

  // Check if number matches verification
  if (verifyIsInscriptionNumber && String(data.number) !== String(verifyIsInscriptionNumber)) {
    throw new Error(error);
  }

  // Extract additional metadata
  try {
    data.contentType = html.match(/<dd>(\w+\/[-+.\w]+)</)?.[1] || 'unknown';
    
    // FIX: Improved timestamp parsing with validation
    const timestampMatch = html.match(/<dd>([\d:-]+\s+UTC)</)?.[1];
    if (timestampMatch) {
      // Try to parse the timestamp, fallback to current date if invalid
      const parsedDate = new Date(timestampMatch);
      data.timestamp = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    } else {
      data.timestamp = new Date();
    }
    
    data.address = html.match(/<dd class=address>(\w+)</)?.[1] || 'unknown';
  } catch (e) {
    console.log('Error parsing additional metadata:', e);
    // Ensure we always have a valid timestamp
    data.timestamp = new Date();
  }

  // Transform to consistent format
  return {
    inscription_id: inscriptionId,
    inscription_number: data.number,
    content_type: data.contentType,
    address: data.address,
    output_value: data['Output Value'] ? parseInt(data['Output Value']) : 0,
    sat: data.Sat,
    sat_rarity: data['Sat Rarity'] || 'N/A',
    timestamp: data.timestamp, // This is now guaranteed to be a valid Date
    genesis_tx: data['Genesis Transaction'],
    output: data.Output,
    location: data.Location,
    value: data.Value ? parseInt(data.Value) : 0,
    content: `https://ordinals.com/content/${inscriptionId}`,
    fetched_at: new Date()
  };
}

/**
 * Save ordinal data to database
 */
async function saveOrdinalToDatabase(apiData) {
  try {
    const ordinalData = {
      inscription_id: apiData.inscription_id,
      inscription_number: apiData.inscription_number,
      content: apiData.content,
      content_type: apiData.content_type,
      address: apiData.address,
      output_value: apiData.output_value,
      sat: apiData.sat,
      sat_rarity: apiData.sat_rarity,
      timestamp: apiData.timestamp,
      genesis_tx: apiData.genesis_tx,
      output: apiData.output,
      location: apiData.location,
      value: apiData.value,
      last_fetched: new Date(),
      fetch_count: 1
    };

    // FIX: Validate and clean all date fields
    if (ordinalData.timestamp && !isValidDate(ordinalData.timestamp)) {
      console.log('⚠️ Invalid timestamp found, using current date');
      ordinalData.timestamp = new Date();
    }
    
    if (ordinalData.last_fetched && !isValidDate(ordinalData.last_fetched)) {
      ordinalData.last_fetched = new Date();
    }

    // Remove undefined fields
    Object.keys(ordinalData).forEach(key => {
      if (ordinalData[key] === undefined) {
        delete ordinalData[key];
      }
    });

    const ordinal = await Ordinal.findOneAndUpdate(
      { 
        $or: [
          { inscription_id: ordinalData.inscription_id },
          { inscription_number: ordinalData.inscription_number }
        ]
      },
      ordinalData,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`💾 Saved to database: ${ordinalData.inscription_id}`);
    return ordinal;
  } catch (error) {
    console.error('Error saving to database:', error);
    throw error;
  }
}

/**
 * Utility function to validate dates
 */
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Transform ordinal for API response
 */
function transformOrdinalForResponse(ordinal) {
  if (!ordinal) return null;
  
  const response = {
    inscription_id: ordinal.inscription_id,
    inscription_number: ordinal.inscription_number,
    content: ordinal.content,
    content_type: ordinal.content_type,
    address: ordinal.address,
    output_value: ordinal.output_value,
    sat: ordinal.sat,
    sat_rarity: ordinal.sat_rarity,
    timestamp: ordinal.timestamp,
    genesis_tx: ordinal.genesis_tx,
    output: ordinal.output,
    location: ordinal.location,
    value: ordinal.value,
    last_fetched: ordinal.last_fetched,
    fetch_count: ordinal.fetch_count
  };

  // Ensure all dates are valid in response
  if (response.timestamp && !isValidDate(new Date(response.timestamp))) {
    response.timestamp = new Date().toISOString();
  }
  
  if (response.last_fetched && !isValidDate(new Date(response.last_fetched))) {
    response.last_fetched = new Date().toISOString();
  }

  return response;
}

/**
 * Get all ordinals with pagination
 */
export const getAllOrdinals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sort = 'createdAt',
      order = 'desc',
      search = '',
      content_type = '',
      listed = ''
    } = req.query;

    const filter = {};
    
    // Search filter
    if (search) {
      filter.$or = [
        { inscription_id: { $regex: search, $options: 'i' } },
        { inscription_number: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Content type filter
    if (content_type) {
      filter.content_type = content_type;
    }
    
    // Listed filter
    if (listed === 'true') {
      filter.is_listed = true;
    } else if (listed === 'false') {
      filter.is_listed = false;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sort configuration
    const sortConfig = { [sort]: order === 'desc' ? -1 : 1 };

    // Execute queries in parallel - REMOVED POPULATE
    const [ordinals, total] = await Promise.all([
      Ordinal.find(filter)
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      Ordinal.countDocuments(filter)
    ]);

    const pages = Math.ceil(total / limitNum);
    
    res.json({
      success: true,
      data: ordinals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: pages,
        hasNext: pageNum < pages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching ordinals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
/**
 * Force refresh an ordinal
 */
export const refreshOrdinal = async (req, res) => {
  try {
    const { inscriptionId } = req.params;
    
    // Delete from database to force fresh fetch
    await Ordinal.deleteOne({
      $or: [
        { inscription_id: inscriptionId },
        { inscription_number: inscriptionId }
      ]
    });
    
    // Now fetch fresh data
    const response = await getOrdinalById(req, res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
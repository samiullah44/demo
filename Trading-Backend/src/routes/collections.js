// routes/collections.js
import express from 'express';
import Collection from '../models/Collection.js';
import { fetchCollectionFromGitHub } from '../services/githubService.js';
import { redisService } from '../config/redis.js';
import collectionsService from '../services/collectionsService.js';

const router = express.Router();

// Cache middleware
const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    const { slug } = req.params;
    const cacheKey = `collection:${slug}`;
    
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log(`✅ Serving ${slug} from Redis cache`);
        return res.json(JSON.parse(cached));
      }
      next();
    } catch (error) {
      console.warn('Cache middleware error, proceeding without cache:', error.message);
      next();
    }
  };
};

// ============================================
// LEADERBOARD ENDPOINTS - MUST COME BEFORE DYNAMIC ROUTES
// ============================================

// Get featured collections
router.get('/featured', async (req, res) => {
  try {
    console.log('📊 Fetching featured collections...');
    const collections = await collectionsService.getFeaturedCollections();
    
    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('Error fetching featured collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get latest collections
router.get('/latest', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    console.log(`🆕 Fetching latest ${limit} collections...`);
    const collections = await collectionsService.getLatestCollections(parseInt(limit));
    
    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('Error fetching latest collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top collections
router.get('/top', async (req, res) => {
  try {
    const { limit = 50, timeframe = '24h' } = req.query;
    console.log(`🏆 Fetching top ${limit} collections for ${timeframe}...`);
    const collections = await collectionsService.getTopCollections(parseInt(limit), timeframe);
    
    res.json({
      success: true,
      data: collections,
      timeframe
    });
  } catch (error) {
    console.error('Error fetching top collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search collections
router.get('/search', async (req, res) => {
  try {
    const { 
      q: query, 
      category, 
      rarity, 
      minFloorPrice, 
      maxFloorPrice,
      minVolume,
      page = 1,
      limit = 20
    } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (rarity) filters.rarity = rarity;
    if (minFloorPrice) filters.minFloorPrice = parseFloat(minFloorPrice);
    if (maxFloorPrice) filters.maxFloorPrice = parseFloat(maxFloorPrice);
    if (minVolume) filters.minVolume = parseFloat(minVolume);
    
    console.log(`🔍 Searching collections: ${query || 'all'}`);
    const result = await collectionsService.searchCollections(
      query, 
      filters, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// INDIVIDUAL COLLECTION ENDPOINTS
// ============================================

// Get collection by slug
router.get('/:slug', cacheMiddleware(1800), async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Prevent trying to fetch "featured", "latest", "top" as collection slugs
    const reservedRoutes = ['featured', 'latest', 'top', 'search', 'ingest', 'health'];
    if (reservedRoutes.includes(slug)) {
      return res.status(404).json({
        success: false,
        error: `Collection "${slug}" not found`
      });
    }
    
    console.log(`📥 Fetching collection: ${slug}`);
    
    // Check database first
    let collection = await Collection.findOne({ 
      slug, 
      isActive: true 
    }).lean();
    
    if (collection) {
      console.log(`✅ Found ${slug} in database`);
      
      // Update fetch count and cache
      await Collection.updateOne(
        { _id: collection._id }, 
        { 
          $inc: { fetchCount: 1 }, 
          lastFetched: new Date() 
        }
      );
      
      // Cache the response
      const cacheKey = `collection:${slug}`;
      await redisService.setex(cacheKey, 1800, JSON.stringify(collection));
      
      return res.json({
        success: true,
        data: collection
      });
    }
    
    // If not in database, fetch from GitHub
    console.log(`🔄 ${slug} not in database, fetching from GitHub...`);
    const githubData = await fetchCollectionFromGitHub(slug);
    
    if (!githubData || !githubData.inscriptions) {
      return res.status(404).json({ 
        success: false,
        error: `Collection "${slug}" not found`,
        message: 'The collection does not exist or is not accessible'
      });
    }
    
    // Save to database
    collection = new Collection({
      slug,
      name: githubData.name || slug,
      inscriptions: githubData.inscriptions,
      source: 'github',
      lastFetched: new Date()
    });
    
    await collection.save();
    console.log(`💾 Saved ${slug} to database with ${githubData.inscriptions.length} inscriptions`);
    
    // Cache the new collection
    const cacheKey = `collection:${slug}`;
    await redisService.setex(cacheKey, 1800, JSON.stringify(collection.toObject()));
    
    res.json({
      success: true,
      data: collection.toObject(),
      source: 'github'
    });
    
  } catch (error) {
    console.error(`❌ Error fetching collection ${req.params.slug}:`, error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = `Collection "${req.params.slug}" not found`;
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      statusCode = 504;
      errorMessage = 'Network timeout while fetching collection';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get collection analytics
router.get('/:slug/analytics', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`📈 Fetching analytics for: ${slug}`);
    const analytics = await collectionsService.getCollectionAnalytics(slug);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching collection analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update collection market data
router.put('/:slug/market-data', async (req, res) => {
  try {
    const { slug } = req.params;
    const marketData = req.body;
    
    console.log(`🔄 Updating market data for: ${slug}`);
    const collection = await collectionsService.updateCollectionMarketData(slug, marketData);
    
    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    console.error('Error updating collection market data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// DATA INGESTION ENDPOINTS
// ============================================

// Manual collection insertion
router.post('/manual', async (req, res) => {
  try {
    const { slug, name, inscriptions, marketData } = req.body;

    if (!slug || !name || !inscriptions || !Array.isArray(inscriptions)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'slug, name, and inscriptions array are required'
      });
    }

    console.log(`🔄 Manual insertion for collection: ${slug}`);

    // Check if collection already exists
    let existingCollection = await Collection.findOne({ slug });

    if (existingCollection) {
      // Update existing collection
      existingCollection.name = name;
      existingCollection.inscriptions = inscriptions;
      existingCollection.source = 'manual';
      existingCollection.lastFetched = new Date();
      
      if (marketData) {
        await existingCollection.updateMarketData(marketData);
      }
      
      await existingCollection.save();
      console.log(`✅ Updated existing collection: ${slug}`);

      // Update cache
      const cacheKey = `collection:${slug}`;
      await redisService.setex(cacheKey, 1800, JSON.stringify(existingCollection.toObject()));

      return res.json({
        success: true,
        action: 'updated',
        data: existingCollection
      });
    } else {
      // Create new collection
      const newCollection = new Collection({
        slug: slug.toLowerCase().trim(),
        name: name,
        inscriptions: inscriptions,
        source: 'manual',
        lastFetched: new Date(),
        isActive: true
      });

      if (marketData) {
        await newCollection.updateMarketData(marketData);
      }

      await newCollection.save();
      console.log(`✅ Created new collection: ${slug} with ${inscriptions.length} inscriptions`);

      // Cache the new collection
      const cacheKey = `collection:${slug}`;
      await redisService.setex(cacheKey, 1800, JSON.stringify(newCollection.toObject()));

      return res.status(201).json({
        success: true,
        action: 'created',
        data: newCollection
      });
    }

  } catch (error) {
    console.error('❌ Error in manual collection insertion:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Collection already exists',
        details: `A collection with slug "${req.body.slug}" already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to insert collection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Data ingestion endpoint
router.post('/ingest', async (req, res) => {
  try {
    const collectionData = req.body;
    
    if (!collectionData.slug) {
      return res.status(400).json({
        success: false,
        error: 'Collection slug is required'
      });
    }
    
    console.log(`📥 Ingesting data for: ${collectionData.slug}`);
    
    // Find or create collection
    const collection = await Collection.findOrCreate(collectionData.slug, collectionData);
    
    // Update with any provided market data
    if (collectionData.marketData) {
      await collection.updateMarketData(collectionData.marketData);
    }
    
    // Update inscriptions if provided
    if (collectionData.inscriptions && Array.isArray(collectionData.inscriptions)) {
      collection.inscriptions = collectionData.inscriptions;
      await collection.save();
    }
    
    res.json({
      success: true,
      data: collection,
      action: collection.isNew ? 'created' : 'updated'
    });
    
  } catch (error) {
    console.error('Error ingesting collection data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch data ingestion
router.post('/ingest/batch', async (req, res) => {
  try {
    const { collections } = req.body;
    
    if (!Array.isArray(collections)) {
      return res.status(400).json({
        success: false,
        error: 'Collections array is required'
      });
    }
    
    console.log(`📦 Batch ingesting ${collections.length} collections...`);
    
    const results = [];
    
    for (const collectionData of collections) {
      try {
        if (!collectionData.slug) continue;
        
        const collection = await Collection.findOrCreate(collectionData.slug, collectionData);
        
        if (collectionData.marketData) {
          await collection.updateMarketData(collectionData.marketData);
        }
        
        results.push({
          slug: collectionData.slug,
          success: true,
          action: collection.isNew ? 'created' : 'updated'
        });
      } catch (error) {
        results.push({
          slug: collectionData.slug,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      processed: results.length
    });
    
  } catch (error) {
    console.error('Error in batch ingestion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ADMIN & UTILITY ENDPOINTS
// ============================================

// Health check endpoint
router.get('/health/status', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisService.isConnected ? 'connected' : 'disconnected',
    database: 'connected',  
    uptime: process.uptime()
  };
  
  res.json(health);
});

// Get service stats
router.get('/_/stats', async (req, res) => {
  try {
    const stats = collectionsService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
router.delete('/_/cache', async (req, res) => {
  try {
    collectionsService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
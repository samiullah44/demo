// routes/collections.js
import express from 'express';
import Collection from '../models/Collection.js';
import { fetchCollectionFromGitHub } from '../services/githubService.js';
import { redisService } from '../config/redis.js';

const router = express.Router();

// Enhanced cache middleware with Redis fallback
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
      next(); // Proceed without cache
    }
  };
};
// Manual collection insertion endpoint - UPDATED FOR YOUR SCHEMA
router.post('/manual', async (req, res) => {
  try {
    const { slug, name, inscriptions } = req.body;

    // Validate required fields
    if (!slug || !name || !inscriptions || !Array.isArray(inscriptions)) {
      return res.status(400).json({
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
      
      await existingCollection.save();
      console.log(`✅ Updated existing collection: ${slug}`);

      // Update cache
      const cacheKey = `collection:${slug}`;
      await redisService.setex(cacheKey, 1800, JSON.stringify(existingCollection.toObject()));

      return res.json({
        success: true,
        action: 'updated',
        collection: {
          slug: existingCollection.slug,
          name: existingCollection.name,
          inscriptions: existingCollection.inscriptions,
          source: existingCollection.source,
          lastFetched: existingCollection.lastFetched,
          fetchCount: existingCollection.fetchCount,
          isActive: existingCollection.isActive
        },
        message: `Collection ${slug} updated successfully with ${inscriptions.length} inscriptions`
      });
    } else {
      // Create new collection
      const newCollection = new Collection({
        slug: slug.toLowerCase().trim(),
        name: name,
        inscriptions: inscriptions,
        source: 'manual',
        lastFetched: new Date(),
        isActive: true,
        fetchCount: 0,
        errorCount: 0
      });

      await newCollection.save();
      console.log(`✅ Created new collection: ${slug} with ${inscriptions.length} inscriptions`);

      // Cache the new collection
      const cacheKey = `collection:${slug}`;
      await redisService.setex(cacheKey, 1800, JSON.stringify(newCollection.toObject()));

      return res.status(201).json({
        success: true,
        action: 'created',
        collection: {
          slug: newCollection.slug,
          name: newCollection.name,
          inscriptions: newCollection.inscriptions,
          source: newCollection.source,
          lastFetched: newCollection.lastFetched,
          fetchCount: newCollection.fetchCount,
          isActive: newCollection.isActive
        },
        message: `Collection ${slug} created successfully with ${inscriptions.length} inscriptions`
      });
    }

  } catch (error) {
    console.error('❌ Error in manual collection insertion:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
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

// Get collection by slug with enhanced error handling
router.get('/:slug', cacheMiddleware(1800), async (req, res) => {
  try {
    const { slug } = req.params;
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
        ...collection,
        source: 'database',
        cached: true
      });
    }
    
    // If not in database, fetch from GitHub
    console.log(`🔄 ${slug} not in database, fetching from GitHub...`);
    const githubData = await fetchCollectionFromGitHub(slug);
    
    if (!githubData || !githubData.inscriptions) {
      return res.status(404).json({ 
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
      ...collection.toObject(),
      source: 'github',
      cached: false
    });
    
  } catch (error) {
    console.error(`❌ Error fetching collection ${req.params.slug}:`, error);
    
    // Provide helpful error messages
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
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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

export default router;
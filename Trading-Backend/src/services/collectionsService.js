// services/collectionsService.js
import Collection from '../models/Collection.js';

class CollectionsService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      requests: 0,
      cacheHits: 0,
      dbHits: 0
    };
  }

  async getFeaturedCollections() {
    this.stats.requests++;
    const cacheKey = 'featured_collections';
    
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    const collections = await Collection.getFeatured();
    this.cache.set(cacheKey, collections, 60000); // 1 minute cache
    
    return collections;
  }

  async getLatestCollections(limit = 10) {
    this.stats.requests++;
    const cacheKey = `latest_${limit}`;
    
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    const collections = await Collection.getLatest(limit);
    this.cache.set(cacheKey, collections, 30000); // 30 second cache
    
    return collections;
  }

  async getTopCollections(limit = 50, timeframe = '24h') {
    this.stats.requests++;
    const cacheKey = `top_${limit}_${timeframe}`;
    
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    const collections = await Collection.getTopCollections(limit, timeframe);
    this.cache.set(cacheKey, collections, 30000);
    
    return collections;
  }

  async searchCollections(query, filters = {}, page = 1, limit = 20) {
    const searchFilter = { isActive: true };
    
    // Text search
    if (query) {
      searchFilter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { slug: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Apply filters
    if (filters.category) {
      searchFilter.category = filters.category;
    }
    
    if (filters.rarity) {
      searchFilter.rarity = filters.rarity;
    }
    
    if (filters.minFloorPrice !== undefined) {
      searchFilter.floor_price = { $gte: filters.minFloorPrice };
    }
    
    if (filters.maxFloorPrice !== undefined) {
      searchFilter.floor_price = searchFilter.floor_price || {};
      searchFilter.floor_price.$lte = filters.maxFloorPrice;
    }

    if (filters.minVolume !== undefined) {
      searchFilter.volume_24h = { $gte: filters.minVolume };
    }
    
    const skip = (page - 1) * limit;
    
    const [collections, total] = await Promise.all([
      Collection.find(searchFilter)
        .sort({ volume_24h: -1 })
        .skip(skip)
        .limit(limit),
      Collection.countDocuments(searchFilter)
    ]);
    
    return {
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getCollectionAnalytics(slug) {
    const collection = await Collection.findOne({ slug, isActive: true });
    if (!collection) {
      throw new Error('Collection not found');
    }
    
    // Generate analytics data from price history
    const analytics = {
      price_history: collection.price_history.slice(-30), // Last 30 days
      volume_trend: this.calculateVolumeTrend(collection),
      sales_trend: this.calculateSalesTrend(collection),
      market_health: collection.market_health_score,
      inscription_stats: {
        total: collection.inscriptionCount,
        unique_owners: collection.num_owners,
        listed_percentage: collection.percent_listed
      }
    };
    
    return analytics;
  }

  calculateVolumeTrend(collection) {
    const current = collection.volume_24h;
    const previous = collection.volume_7d / 7; // Average daily volume
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  calculateSalesTrend(collection) {
    const current = collection.sales_24h;
    const previous = collection.sales_7d / 7; // Average daily sales
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  async updateCollectionMarketData(slug, marketData) {
    const collection = await Collection.findOne({ slug, isActive: true });
    if (!collection) {
      throw new Error('Collection not found');
    }

    await collection.updateMarketData(marketData);
    
    // Add to price history if floor price changed
    if (marketData.floor_price !== undefined) {
      await collection.addPriceHistory({
        floor_price: marketData.floor_price,
        volume: marketData.volume_24h || 0,
        sales: marketData.sales_24h || 0
      });
    }

    // Recalculate market health
    await collection.calculateMarketHealth();

    // Clear relevant caches
    this.clearCollectionCaches(slug);
    
    return collection;
  }

  clearCollectionCaches(slug) {
    // Clear all caches that might contain this collection
    const cacheKeys = [
      'featured_collections',
      'latest_10',
      'latest_20',
      'top_20_24h',
      'top_30_24h', 
      'top_40_24h',
      'top_50_24h',
      'top_20_7d',
      'top_30_7d',
      'top_40_7d',
      'top_50_7d'
    ];
    
    cacheKeys.forEach(key => this.cache.delete(key));
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new CollectionsService();
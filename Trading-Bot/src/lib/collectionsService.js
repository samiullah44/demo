// lib/collectionsService.js
import axiosInstance from './axios';

class CollectionsCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      requests: 0,
      cacheHits: 0
    };
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expiry) {
      this.stats.cacheHits++;
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key, data, ttl = 2 * 60 * 1000) { // 2 minutes default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size
    };
  }

  clear() {
    this.cache.clear();
  }
}

export const collectionsCache = new CollectionsCache();

/**
 * Get featured collections
 */
export async function getFeaturedCollections() {
  collectionsCache.stats.requests++;
  const cacheKey = 'featured_collections';
  
  const cached = collectionsCache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await axiosInstance.get('/collections/featured');
    const result = response.data;
    
    if (result.success) {
      collectionsCache.set(cacheKey, result.data);
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to fetch featured collections');
  } catch (error) {
    console.error('Error fetching featured collections:', error);
    throw error;
  }
}

/**
 * Get latest collections
 */
export async function getLatestCollections(limit = 10) {
  collectionsCache.stats.requests++;
  const cacheKey = `latest_${limit}`;
  
  const cached = collectionsCache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await axiosInstance.get('/collections/latest', {
      params: { limit }
    });
    const result = response.data;
    
    if (result.success) {
      collectionsCache.set(cacheKey, result.data);
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to fetch latest collections');
  } catch (error) {
    console.error('Error fetching latest collections:', error);
    throw error;
  }
}

/**
 * Get top collections
 */
export async function getTopCollections(limit = 50, timeframe = '24h') {
  collectionsCache.stats.requests++;
  const cacheKey = `top_${limit}_${timeframe}`;
  
  const cached = collectionsCache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await axiosInstance.get('/collections/top', {
      params: { limit, timeframe }
    });
    const result = response.data;
    
    if (result.success) {
      collectionsCache.set(cacheKey, result.data);
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to fetch top collections');
  } catch (error) {
    console.error('Error fetching top collections:', error);
    throw error;
  }
}

/**
 * Search collections
 */
export async function searchCollections(query, filters = {}, page = 1, limit = 20) {
  try {
    const params = {
      q: query,
      page,
      limit,
      ...filters
    };
    
    const response = await axiosInstance.get('/collections/search', { params });
    const result = response.data;
    
    if (result.success) {
      return result;
    }
    
    throw new Error(result.error || 'Search failed');
  } catch (error) {
    console.error('Error searching collections:', error);
    throw error;
  }
}

/**
 * Get collection analytics
 */
export async function getCollectionAnalytics(slug) {
  try {
    const response = await axiosInstance.get(`/collections/${slug}/analytics`);
    const result = response.data;
    
    if (result.success) {
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to fetch analytics');
  } catch (error) {
    console.error('Error fetching collection analytics:', error);
    throw error;
  }
}

/**
 * Update collection market data
 */
export async function updateCollectionMarketData(slug, marketData) {
  try {
    const response = await axiosInstance.put(`/collections/${slug}/market-data`, marketData);
    const result = response.data;
    
    if (result.success) {
      // Clear relevant caches after update
      collectionsCache.clear();
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to update market data');
  } catch (error) {
    console.error('Error updating collection market data:', error);
    throw error;
  }
}
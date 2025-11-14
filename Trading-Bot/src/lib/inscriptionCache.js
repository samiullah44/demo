// lib/inscriptionCache.js

/**
 * InscriptionCache - Manages caching and request deduplication for inscription data
 * Features:
 * - In-memory caching with TTL (Time To Live)
 * - Request deduplication (prevents multiple simultaneous requests for same ID)
 * - Automatic cache expiration
 * - Cache statistics tracking
 */
class InscriptionCache {
  constructor(cacheDuration = 10 * 60 * 1000) { // Default 10 minutes
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.CACHE_DURATION = cacheDuration;
    this.stats = {
      hits: 0,
      misses: 0,
      requests: 0
    };
  }

  /**
   * Get cached data by ID
   * @param {string} id - Inscription ID
   * @returns {object|null} - Cached data or null if not found/expired
   */
  get(id) {
    const cached = this.cache.get(id);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(id);
      this.stats.misses++;
      console.log(`🗑️ Cache expired for inscription: ${id}`);
      return null;
    }
    
    this.stats.hits++;
    console.log(`✅ Cache hit for inscription: ${id} (${this.stats.hits} total hits)`);
    return cached.data;
  }

  /**
   * Set cache data for an ID
   * @param {string} id - Inscription ID
   * @param {object} data - Data to cache
   */
  set(id, data) {
    this.cache.set(id, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cached inscription data: ${id}`);
  }

  /**
   * Get pending request promise for deduplication
   * @param {string} id - Inscription ID
   * @returns {Promise|null}
   */
  getPendingRequest(id) {
    return this.pendingRequests.get(id);
  }

  /**
   * Store pending request promise
   * @param {string} id - Inscription ID
   * @param {Promise} promise - Request promise
   */
  setPendingRequest(id, promise) {
    this.pendingRequests.set(id, promise);
    console.log(`⏳ Pending request registered: ${id}`);
  }

  /**
   * Clear pending request after completion
   * @param {string} id - Inscription ID
   */
  clearPendingRequest(id) {
    this.pendingRequests.delete(id);
    console.log(`✓ Pending request completed: ${id}`);
  }

  /**
   * Clear all cache and pending requests
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.stats = { hits: 0, misses: 0, requests: 0 };
    console.log('🧹 Cache cleared');
  }

  /**
   * Remove specific entry from cache
   * @param {string} id - Inscription ID
   */
  remove(id) {
    this.cache.delete(id);
    console.log(`🗑️ Removed from cache: ${id}`);
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    const hitRate = this.stats.requests > 0 
      ? ((this.stats.hits / this.stats.requests) * 100).toFixed(2) 
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size
    };
  }

  /**
   * Check if ID is cached and valid
   * @param {string} id - Inscription ID
   * @returns {boolean}
   */
  has(id) {
    const cached = this.cache.get(id);
    if (!cached) return false;
    
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(id);
      return false;
    }
    
    return true;
  }

  /**
   * Get all cached IDs
   * @returns {Array<string>}
   */
  getCachedIds() {
    return Array.from(this.cache.keys());
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
    
    return cleaned;
  }
}

// Create singleton instance
export const inscriptionCache = new InscriptionCache();

// Optional: Clean expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    inscriptionCache.cleanExpired();
  }, 5 * 60 * 1000);
}

export default InscriptionCache;
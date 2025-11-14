// config/redis.js
import Redis from 'ioredis';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  init() {
    try {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 5000,
        retryStrategy(times) {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.warn('❌ Redis connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('⚠️  Redis not connected - using in-memory fallback');
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      console.warn('Redis get error:', error.message);
      return null;
    }
  }

  async setex(key, seconds, value) {
    if (!this.isConnected || !this.client) {
      return;
    }
    try {
      await this.client.setex(key, seconds, value);
    } catch (error) {
      console.warn('Redis setex error:', error.message);
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis del error:', error.message);
    }
  }
}

export const redisService = new RedisService();
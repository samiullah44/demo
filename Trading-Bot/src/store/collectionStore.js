// stores/collectionStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axiosInstance from '../lib/axios';
import { 
  getFeaturedCollections, 
  getLatestCollections, 
  getTopCollections,
  getCollectionAnalytics 
} from '../lib/collectionsService';

const useCollectionStore = create(devtools((set, get) => ({
  // State for individual collections
  currentCollection: null,
  
  // State for leaderboard
  featuredCollections: [],
  latestCollections: [],
  topCollections: [],
  leaderboardLoading: false,
  leaderboardError: null,
  
  // Cache for all types of data
  cache: new Map(),
  
  // Actions for individual collections
  fetchCollection: async (slug) => {
    // Check in-memory cache first (5 minute cache)
    const cached = get().cache.get(`collection_${slug}`);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      set({ 
        currentCollection: cached.data, 
        loading: false, 
        error: null 
      });
      return cached.data;
    }
    
    set({ loading: true, error: null, currentCollection: null });
    
    try {
      const response = await axiosInstance.get(`/collections/${slug}`);
      const collectionData = response.data;
      
      // Update cache
      get().cache.set(`collection_${slug}`, {
        data: collectionData,
        timestamp: Date.now()
      });
      
      set({ 
        currentCollection: collectionData, 
        loading: false, 
        error: null 
      });
      
      return collectionData;
      
    } catch (error) {
      console.error('Error fetching collection:', error);
      const errorMessage = error.response?.data?.error || error.message || `Failed to fetch collection: ${slug}`;
      
      set({ 
        error: errorMessage, 
        loading: false, 
        currentCollection: null 
      });
      throw new Error(errorMessage);
    }
  },
  
  // Actions for leaderboard data
  fetchLeaderboardData: async (tab, options = {}) => {
    const { limit = 20, timeframe = '24h' } = options;
    
    set({ leaderboardLoading: true, leaderboardError: null });
    
    try {
      let data;
      const cacheKey = `leaderboard_${tab}_${limit}_${timeframe}`;
      
      // Check cache first
      const cached = get().cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) { // 2 minute cache
        data = cached.data;
      } else {
        // Fetch from API
        switch (tab) {
          case 'featured':
            data = await getFeaturedCollections();
            break;
          case 'latest':
            data = await getLatestCollections(limit);
            break;
          case 'all':
            data = await getTopCollections(limit, timeframe);
            break;
          default:
            throw new Error(`Unknown tab: ${tab}`);
        }
        
        // Update cache
        get().cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      // Update state based on tab
      switch (tab) {
        case 'featured':
          set({ featuredCollections: data, leaderboardLoading: false });
          break;
        case 'latest':
          set({ latestCollections: data, leaderboardLoading: false });
          break;
        case 'all':
          set({ topCollections: data, leaderboardLoading: false });
          break;
      }
      
      return data;
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch leaderboard data';
      
      set({ 
        leaderboardError: errorMessage, 
        leaderboardLoading: false 
      });
      throw new Error(errorMessage);
    }
  },
  
  // Fetch collection analytics
  fetchCollectionAnalytics: async (slug) => {
    const cacheKey = `analytics_${slug}`;
    
    // Check cache first
    const cached = get().cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }
    
    try {
      const analytics = await getCollectionAnalytics(slug);
      
      // Update cache
      get().cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });
      
      return analytics;
    } catch (error) {
      console.error('Error fetching collection analytics:', error);
      throw error;
    }
  },
  
  // Data ingestion - send collection data to backend
  ingestCollectionData: async (collectionData) => {
    try {
      const response = await axiosInstance.post('/collections/ingest', collectionData);
      return response.data;
    } catch (error) {
      console.error('Error ingesting collection data:', error);
      throw error;
    }
  },
  
  // Update market data for a collection
  updateCollectionMarketData: async (slug, marketData) => {
    try {
      const response = await axiosInstance.put(`/collections/${slug}/market-data`, marketData);
      
      // Clear relevant caches
      get().clearLeaderboardCaches();
      get().cache.delete(`collection_${slug}`);
      get().cache.delete(`analytics_${slug}`);
      
      return response.data;
    } catch (error) {
      console.error('Error updating market data:', error);
      throw error;
    }
  },
  
  // Clear specific caches
  clearLeaderboardCaches: () => {
    const cache = get().cache;
    const keysToDelete = [];
    
    // Find all leaderboard cache keys
    for (const key of cache.keys()) {
      if (key.startsWith('leaderboard_')) {
        keysToDelete.push(key);
      }
    }
    
    // Delete them
    keysToDelete.forEach(key => cache.delete(key));
    
    set({ cache: new Map(cache) }); // Trigger re-render
  },
  
  clearCurrentCollection: () => {
    set({ currentCollection: null, error: null });
  },
  
  clearCache: () => {
    set({ cache: new Map() });
  },
  
  // Preload collection for better UX
  preloadCollection: async (slug) => {
    if (!get().cache.has(`collection_${slug}`)) {
      try {
        const response = await axiosInstance.get(`/collections/${slug}`);
        get().cache.set(`collection_${slug}`, {
          data: response.data,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Preload failed for:', slug, error);
      }
    }
  }
})));

export default useCollectionStore;
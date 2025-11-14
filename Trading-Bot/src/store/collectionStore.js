// stores/collectionStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axiosInstance from '../lib/axios';

const useCollectionStore = create(devtools((set, get) => ({
  // State
  currentCollection: null,
  loading: false,
  error: null,
  cache: new Map(),
  
  // Actions
  fetchCollection: async (slug) => {
    // Check in-memory cache first (5 minute cache)
    const cached = get().cache.get(slug);
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
      get().cache.set(slug, {
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
  
  clearCurrentCollection: () => {
    set({ currentCollection: null, error: null });
  },
  
  clearCache: () => {
    set({ cache: new Map() });
  },
  
  // Preload collection for better UX
  preloadCollection: async (slug) => {
    if (!get().cache.has(slug)) {
      try {
        const response = await axiosInstance.get(`/collections/${slug}`);
        get().cache.set(slug, {
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
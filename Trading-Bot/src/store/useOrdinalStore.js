// stores/useOrdinalStore.js
import { create } from 'zustand';
import axiosInstance from '../lib/axios';

const useOrdinalStore = create((set, get) => ({
  ordinals: [],
  userOrdinals: [],
  portfolioStats: null,
  portfolioHistory: [],
  performanceMetrics: null,
  currentOrdinal: null, // NEW: For single ordinal view
  loading: false,
  error: null,

  // NEW: Get single ordinal by ID (uses our unified backend)
  getOrdinalById: async (inscriptionId, options = {}) => {
    try {
      set({ loading: true, error: null, currentOrdinal: null });
      
      const params = new URLSearchParams();
      if (options.refresh) params.append('refresh', options.refresh);
      if (options.verify) params.append('verify', options.verify);

      const response = await axiosInstance.get(`/ordinals/${inscriptionId}?${params}`);
      
      set({ 
        currentOrdinal: response.data.data,
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ordinal:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to fetch ordinal',
        loading: false 
      });
      throw error;
    }
  },

  // Get all ordinals from marketplace
  getAllOrdinals: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axiosInstance.get(`/ordinals?${params}`);
      
      set({ 
        ordinals: response.data.data || [], 
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ordinals:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to fetch ordinals', 
        loading: false 
      });
      throw error;
    }
  },

  // Get user's portfolio data
  getUserOrdinals: async (address, options = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.filter) params.append('filter', options.filter);

      // Fetch user ordinals with portfolio data
      const [ordinalsResponse, statsResponse, historyResponse] = await Promise.all([
        axiosInstance.get(`/portfolio/${address}/ordinals?${params}`),
        axiosInstance.get(`/portfolio/${address}/stats`),
        axiosInstance.get(`/portfolio/${address}/history?timeframe=7d`)
      ]);

      set({ 
        userOrdinals: ordinalsResponse.data.ordinals || [],
        portfolioStats: statsResponse.data.stats,
        portfolioHistory: historyResponse.data.history,
        loading: false 
      });
      
      return ordinalsResponse.data.ordinals;
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      set({ 
        userOrdinals: [], 
        error: error.response?.data?.message || 'Failed to fetch portfolio data',
        loading: false 
      });
      return [];
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (address) => {
    try {
      const response = await axiosInstance.get(`/portfolio/${address}/performance`);
      set({ performanceMetrics: response.data.performance });
      return response.data.performance;
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      throw error;
    }
  },

  // Quick list ordinal
  quickListOrdinal: async (listingData) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.post('/portfolio/quick-list', listingData);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to list ordinal',
        loading: false 
      });
      throw error;
    }
  },

  // Refresh single ordinal
  refreshOrdinal: async (inscriptionId) => {
    return get().getOrdinalById(inscriptionId, { refresh: true });
  },

  // Refresh portfolio
  refreshPortfolio: async (address) => {
    if (!address) return;
    await get().getUserOrdinals(address);
  },

  // Clear current ordinal
  clearCurrentOrdinal: () => set({ currentOrdinal: null }),

  clearError: () => set({ error: null })
}));

export default useOrdinalStore;
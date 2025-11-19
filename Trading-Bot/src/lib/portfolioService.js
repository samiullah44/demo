import axiosInstance from './axios';

export const portfolioService = {
  // Get user portfolio stats
  getPortfolioStats: async (address) => {
    try {
      const response = await axiosInstance.get(`/user/${address}/portfolio/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio stats:', error);
      throw error;
    }
  },

  // Get user ordinals with detailed information
  getUserOrdinals: async (address) => {
    try {
      const response = await axiosInstance.get(`/user/${address}/ordinals`);
      return response.data.ordinals || [];
    } catch (error) {
      console.error('Error fetching user ordinals:', error);
      throw error;
    }
  },

  // Get portfolio performance history
  getPortfolioHistory: async (address, timeframe = '7d') => {
    try {
      const response = await axiosInstance.get(`/user/${address}/portfolio/history?timeframe=${timeframe}`);
      return response.data.history || [];
    } catch (error) {
      console.error('Error fetching portfolio history:', error);
      throw error;
    }
  },

  // Quick list ordinal
  quickListOrdinal: async (listingData) => {
    try {
      const response = await axiosInstance.post('/listings/quick-list', listingData);
      return response.data;
    } catch (error) {
      console.error('Error quick listing ordinal:', error);
      throw error;
    }
  }
};
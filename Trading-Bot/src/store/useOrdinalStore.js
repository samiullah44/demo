import {create} from 'zustand';
import axiosInstance from '../lib/axios';

const useOrdinalStore = create((set) => ({
  ordinals: [],
getAllOrdinals: async () => {
  try {
    const query = await axiosInstance.get('/ordinals/');
    set({ ordinals: query.data.data });
    console.log('Fetched ordinals:', query.data.data);
  } catch (error) {
    console.error('Error fetching ordinals:', error);
  }
},
 getUserOrdinals: async (address) => {
    try {
      const response = await axiosInstance.get(`/user/${address}/ordinals`);
      set({ userOrdinals: response.data.ordinals });
      return response.data.ordinals;
    } catch (error) {
      console.error('Failed to fetch user ordinals:', error);
      set({ userOrdinals: [] });
      return [];
    }
  },
}));

export default useOrdinalStore;
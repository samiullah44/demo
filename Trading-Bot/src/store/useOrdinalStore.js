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
}
}));

export default useOrdinalStore;
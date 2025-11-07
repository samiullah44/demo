import Ordinal from '../models/Ordinal.js';
import { fetchOrdinalData } from '../services/ordinalService.js';

export const getAllOrdinals = async (req, res) => {
  try {
    const ordinals = await Ordinal.find().sort({ fetched_at: -1 });
    res.status(200).json({data:ordinals});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single ordinal by inscription ID
export const getOrdinalById = async (req, res) => {
  try {
    const { inscriptionId } = req.params;
    
    let ordinal = await Ordinal.findOne({ inscription_id: inscriptionId });
    
    // If not in DB, fetch from API
    if (!ordinal) {
      const apiData = await fetchOrdinalData(inscriptionId);
      ordinal = new Ordinal(apiData);
      await ordinal.save();
    }

    res.json(ordinal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Refresh ordinal data from API
export const refreshOrdinalData = async (req, res) => {
  try {
    const { inscriptionId } = req.params;
    const apiData = await fetchOrdinalData(inscriptionId);
    
    const ordinal = await Ordinal.findOneAndUpdate(
      { inscription_id: inscriptionId },
      { ...apiData, fetched_at: new Date() },
      { new: true, upsert: true }
    );

    res.json(ordinal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
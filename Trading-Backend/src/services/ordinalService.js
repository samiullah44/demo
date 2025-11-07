import axios from 'axios';

export const fetchOrdinalData = async (inscriptionId) => {
  try {
    // Try Hiro API first
    const hiroResponse = await axios.get(
      `${process.env.HIRO_API_URL}/inscriptions/${inscriptionId}`
    );
    
    if (hiroResponse.data) {
      return parseHiroData(hiroResponse.data, inscriptionId);
    }
  } catch (error) {
    console.log('Hiro API failed, trying OrdAPI...');
  }

  // Fallback to OrdAPI
  try {
    const ordResponse = await axios.get(
      `${process.env.ORDAPI_URL}/inscription/${inscriptionId}`
    );
    
    if (ordResponse.data) {
      return parseOrdApiData(ordResponse.data, inscriptionId);
    }
  } catch (error) {
    throw new Error('Failed to fetch ordinal data from all APIs');
  }
};

const parseHiroData = (data, inscriptionId) => {
  return {
    inscription_id: inscriptionId,
    name: data.name || `Ordinal #${data.number}`,
    image_url: data.image || data.content_url,
    content_type: data.content_type,
    price_btc: data.price || null,
    owner: data.address,
    location: data.location,
    value: data.value ? parseInt(data.value) : null,
    Sat_Rarity: data.sat_rarity,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    genesis_tx: data.genesis_tx_id,
    fetched_at: new Date()
  };
};

const parseOrdApiData = (data, inscriptionId) => {
  return {
    inscription_id: inscriptionId,
    name: data.name || data.title || `Ordinal #${data.inscription_number}`,
    image_url: data.image || data.content,
    content_type: data.content_type,
    price_btc: data.price || data.listed_price || null,
    owner: data.owner || data.address,
    location: data.location,
    value: data.value ? parseInt(data.value) : null,
    Sat_Rarity: data.sat_rarity || data.rarity,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    genesis_tx: data.genesis_tx,
    fetched_at: new Date()
  };
};
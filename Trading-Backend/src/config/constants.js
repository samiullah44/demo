export const CONSTANTS = {
  // Network
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  ORDINALS_API: process.env.NODE_ENV === 'production' 
    ? 'https://ordinals.com' 
    : 'https://explorer-signet.openordex.org',
  MEMPOOL_API: process.env.NODE_ENV === 'production'
    ? 'https://mempool.space/api'
    : 'https://mempool.space/signet/api',
  
  // PSBT
  DUMMY_UTXO_VALUE: 1000,
  SIGHASH_SINGLE: 0x03,
  SIGHASH_ANYONECANPAY: 0x80,
  
  // Timing
  LISTING_EXPIRY_DAYS: 30,
  CACHE_TTL: 300, // 5 minutes
  
  // Limits
  MAX_LISTING_PRICE_BTC: 10,
  MIN_LISTING_PRICE_SATS: 10000,
  MAX_UTXOS_PER_TX: 10,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  
  // Status
  LISTING_STATUS: {
    ACTIVE: 'active',
    SOLD: 'sold',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
  },
  
  TX_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    FAILED: 'failed'
  }
};
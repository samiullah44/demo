// models/Collection.js
import mongoose from 'mongoose';

const inscriptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  meta: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  }
}, {
  _id: false
});

const priceHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  floor_price: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  }
}, {
  _id: false
});

const collectionSchema = new mongoose.Schema({
  // Core identification (from your existing schema)
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Media
  image_url: {
    type: String,
  },
  banner_url: {
    type: String
  },
  
  // Inscriptions data (from your existing schema)
  inscriptions: [inscriptionSchema],
  
  // Financial metrics (new for leaderboard)
  floor_price: {
    type: Number,
    default: 0,
    index: true
  },
  floor_price_24h_change: {
    type: Number,
    default: 0
  },
  floor_price_7d_change: {
    type: Number,
    default: 0
  },
  floor_price_30d_change: {
    type: Number,
    default: 0
  },
  
  volume_24h: {
    type: Number,
    default: 0,
    index: true
  },
  volume_7d: {
    type: Number,
    default: 0,
    index: true
  },
  volume_30d: {
    type: Number,
    default: 0,
    index: true
  },
  total_volume: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Market activity (new for leaderboard)
  sales_24h: {
    type: Number,
    default: 0
  },
  sales_7d: {
    type: Number,
    default: 0
  },
  sales_30d: {
    type: Number,
    default: 0
  },
  
  // Collection stats (combined)
  total_supply: {
    type: Number,
    default: 0
  },
  num_owners: {
    type: Number,
    default: 0
  },
  percent_listed: {
    type: Number,
    default: 0
  },
  
  // Price history for charts (new for leaderboard)
  price_history: [priceHistorySchema],
  
  // Categorical data (new for leaderboard)
  category: {
    type: String,
    enum: ['art', 'pfp', 'game', 'utility', 'other'],
    default: 'other',
    index: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    default: 'common',
    index: true
  },
  
  // Social metrics (new for leaderboard)
  twitter_followers: {
    type: Number,
    default: 0
  },
  discord_members: {
    type: Number,
    default: 0
  },
  
  // Collection management (from your existing schema)
  lastFetched: {
    type: Date,
    default: Date.now,
    index: true
  },
  fetchCount: {
    type: Number,
    default: 0,
    min: 0
  },
  source: {
    type: String,
    enum: ['github', 'database', 'manual'],
    default: 'github'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  errorCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastError: {
    type: String,
    default: null
  },
  
  // Leaderboard specific fields (new)
  featured_until: {
    type: Date,
    default: null
  },
  market_health_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for inscription count (from your existing schema)
collectionSchema.virtual('inscriptionCount').get(function() {
  return this.inscriptions ? this.inscriptions.length : 0;
});

// Virtual for content URL
collectionSchema.virtual('contentUrl').get(function() {
  return `https://ordinals.com/content/${this.inscriptions[0]?.id}`;
});

// Indexes for better query performance (combined)
collectionSchema.index({ slug: 1, isActive: 1 });
collectionSchema.index({ lastFetched: -1 });
collectionSchema.index({ 'inscriptions.id': 1 });
collectionSchema.index({ floor_price: 1, volume_24h: -1 });
collectionSchema.index({ volume_24h: -1, created_at: -1 });
collectionSchema.index({ featured_until: -1, volume_24h: -1 });
collectionSchema.index({ category: 1, volume_24h: -1 });
collectionSchema.index({ isActive: 1, volume_24h: -1 });

// Static method to find or create collection (from your existing schema)
collectionSchema.statics.findOrCreate = async function(slug, collectionData = null) {
  let collection = await this.findOne({ slug, isActive: true });
  
  if (!collection && collectionData) {
    collection = new this({
      slug,
      name: collectionData.name || slug,
      inscriptions: collectionData.inscriptions || [],
      source: collectionData.source || 'github',
      // Set additional fields if provided
      ...collectionData
    });
    await collection.save();
  }
  
  return collection;
};

// Static methods for leaderboard (new)
collectionSchema.statics.getFeatured = function() {
  return this.find({
    isActive: true,
    $or: [
      { featured_until: { $gte: new Date() } },
      { volume_24h: { $gte: 0.1 } } // At least 0.1 BTC volume
    ]
  })
  .sort({ volume_24h: -1, floor_price: -1 })
  .limit(3);
};

collectionSchema.statics.getLatest = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

collectionSchema.statics.getTopCollections = function(limit = 50, timeframe = '24h') {
  const volumeField = `volume_${timeframe}`;
  return this.find({ 
    isActive: true,
    [volumeField]: { $gt: 0 } 
  })
  .sort({ [volumeField]: -1 })
  .limit(limit);
};

// Method to mark collection as errored (from your existing schema)
collectionSchema.methods.markErrored = function(errorMessage) {
  this.errorCount += 1;
  this.lastError = errorMessage.substring(0, 500);
  return this.save();
};

// Method to update market data (new)
collectionSchema.methods.updateMarketData = function(marketData) {
  const {
    floor_price,
    floor_price_24h_change,
    floor_price_7d_change,
    floor_price_30d_change,
    volume_24h,
    volume_7d,
    volume_30d,
    total_volume,
    sales_24h,
    sales_7d,
    sales_30d,
    num_owners,
    percent_listed
  } = marketData;

  // Update fields if provided
  if (floor_price !== undefined) this.floor_price = floor_price;
  if (floor_price_24h_change !== undefined) this.floor_price_24h_change = floor_price_24h_change;
  if (floor_price_7d_change !== undefined) this.floor_price_7d_change = floor_price_7d_change;
  if (floor_price_30d_change !== undefined) this.floor_price_30d_change = floor_price_30d_change;
  if (volume_24h !== undefined) this.volume_24h = volume_24h;
  if (volume_7d !== undefined) this.volume_7d = volume_7d;
  if (volume_30d !== undefined) this.volume_30d = volume_30d;
  if (total_volume !== undefined) this.total_volume = total_volume;
  if (sales_24h !== undefined) this.sales_24h = sales_24h;
  if (sales_7d !== undefined) this.sales_7d = sales_7d;
  if (sales_30d !== undefined) this.sales_30d = sales_30d;
  if (num_owners !== undefined) this.num_owners = num_owners;
  if (percent_listed !== undefined) this.percent_listed = percent_listed;

  // Update last fetched timestamp
  this.lastFetched = new Date();
  this.fetchCount += 1;

  return this.save();
};

// Method to add price history point (new)
collectionSchema.methods.addPriceHistory = function(pricePoint) {
  this.price_history.push({
    timestamp: new Date(),
    ...pricePoint
  });

  // Keep only last 90 days of history to prevent unbounded growth
  if (this.price_history.length > 90) {
    this.price_history = this.price_history.slice(-90);
  }

  return this.save();
};


collectionSchema.virtual('listed_ordinals', {
  ref: 'Ordinal',
  localField: '_id',
  foreignField: 'collection',
  match: { is_listed: true }
});

collectionSchema.virtual('active_listings', {
  ref: 'Listing',
  localField: '_id',
  foreignField: 'collection',
  match: { status: 'active' }
});

// Add method to update floor price from listings
collectionSchema.methods.updateFloorPrice = async function() {
  const Listing = mongoose.model('Listing');
  
  const lowestListing = await Listing.findOne({
    collection: this._id,
    status: 'active'
  }).sort({ price_btc: 1 });
  
  if (lowestListing) {
    const oldFloorPrice = this.floor_price;
    this.floor_price = lowestListing.price_btc;
    
    // Calculate 24h change if we have history
    if (oldFloorPrice > 0) {
      const change = ((this.floor_price - oldFloorPrice) / oldFloorPrice) * 100;
      this.floor_price_24h_change = change;
    }
  }
  
  return this.save();
};

// Method to calculate market health score (new)
collectionSchema.methods.calculateMarketHealth = function() {
  const volumeScore = Math.min(this.volume_24h / 0.5, 100); // Max 0.5 BTC volume = 100
  const salesScore = Math.min(this.sales_24h / 25, 100); // Max 25 sales = 100
  const ownerScore = this.total_supply > 0 
    ? Math.min((this.num_owners / this.total_supply) * 200, 100) 
    : 0;
  const priceStability = Math.max(0, 100 - Math.abs(this.floor_price_24h_change) * 2);

  this.market_health_score = (
    volumeScore * 0.3 + 
    salesScore * 0.25 + 
    ownerScore * 0.25 + 
    priceStability * 0.2
  );

  return this.save();
};

export default mongoose.model('Collection', collectionSchema);
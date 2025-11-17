import mongoose from 'mongoose';

const ordinalSchema = new mongoose.Schema({
  inscription_id: { 
    type: String, 
    required: [true, 'Inscription ID is required'],
    unique: true, 
    index: true,
    trim: true
  },
  inscription_number: {
    type: String,
    index: true
  },
  name: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true
  },
  
  // Collection relationship (NEW)
  collection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    index: true
  },
  collection_slug: {
    type: String,
    index: true
  },
  
  image_url: { 
    type: String,
    validate: {
      validator: function(v) {
        return !v || v === 'N/A' || /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  content_type: { 
    type: String,
    trim: true,
    index: true
  },
  
  // Pricing info
  price_btc: { 
    type: Number,
    min: [0, 'Price cannot be negative'],
    index: true
  },
  last_sale_price: {
    type: Number,
    default: null
  },
  
  // Ownership info
  owner: { 
    type: String,
    trim: true,
    index: true
  },
  output: {
    type: String,
    trim: true
  },
  location: { 
    type: String,
    trim: true
  },
  value: { 
    type: Number,
    min: [0, 'Value cannot be negative']
  },
  
  // Rarity & attributes
  Sat_Rarity: { 
    type: String,
    enum: {
      values: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'N/A'],
      message: '{VALUE} is not a valid rarity'
    },
    default: 'N/A',
    index: true
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  timestamp: { 
    type: Date,
    index: true 
  },
  genesis_tx: { 
    type: String,
    trim: true
  },
  
  // Status tracking
  is_listed: {
    type: Boolean,
    default: false,
    index: true
  },
  listing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null
  },
  
  fetched_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
ordinalSchema.index({ price_btc: 1, Sat_Rarity: 1 });
ordinalSchema.index({ owner: 1, fetched_at: -1 });
ordinalSchema.index({ content_type: 1, price_btc: 1 });
ordinalSchema.index({ collection: 1, is_listed: 1 });
ordinalSchema.index({ is_listed: 1, price_btc: 1 });

// Text search
ordinalSchema.index({ name: 'text' });

// Virtuals
ordinalSchema.virtual('content_url').get(function() {
  return `https://ordinals.com/content/${this.inscription_id}`;
});

// Methods
ordinalSchema.methods.isAffordable = function(userBalance) {
  return this.price_btc && this.price_btc <= userBalance;
};

ordinalSchema.methods.updateListing = async function(listingId, price) {
  this.is_listed = true;
  this.listing_id = listingId;
  this.price_btc = price;
  return this.save();
};

ordinalSchema.methods.removeListing = async function() {
  this.is_listed = false;
  this.listing_id = null;
  this.price_btc = null;
  return this.save();
};

// Statics
ordinalSchema.statics.findByCollection = function(collectionId) {
  return this.find({ collection: collectionId, is_listed: true });
};

ordinalSchema.statics.findListedInPriceRange = function(minPrice, maxPrice) {
  return this.find({
    is_listed: true,
    price_btc: { $gte: minPrice, $lte: maxPrice }
  }).populate('collection');
};

export default mongoose.model('Ordinal', ordinalSchema);

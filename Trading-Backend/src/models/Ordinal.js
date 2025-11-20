// models/Ordinal.js
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
    required: true,
    index: true
  },
  
  // Core inscription data from API
  content: {
    type: String, // content URL
    trim: true
  },
  content_type: { 
    type: String,
    trim: true,
    index: true
  },
  address: {
    type: String,
    trim: true,
    index: true
  },
  output_value: {
    type: Number,
    default: 0
  },
  sat: {
    type: String,
    trim: true
  },
  sat_rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'N/A'],
    default: 'N/A',
    index: true
  },
  timestamp: { 
    type: Date,
    index: true 
  },
  genesis_tx: { 
    type: String,
    trim: true
  },
  
  // Additional metadata
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
    price_btc: {
    type: Number,
    required: true,
    min: 0
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
  
  // Cache management
  last_fetched: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  fetch_count: {
    type: Number,
    default: 0
  },
  is_stale: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ordinalSchema.index({ inscription_id: 1, last_fetched: -1 });
ordinalSchema.index({ inscription_number: 1 });
ordinalSchema.index({ last_fetched: 1 });

// Virtuals
ordinalSchema.virtual('content_url').get(function() {
  return this.content || `https://ordinals.com/content/${this.inscription_id}`;
});

// Methods
ordinalSchema.methods.markAsStale = async function() {
  this.is_stale = true;
  this.last_fetched = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  return this.save();
};

ordinalSchema.methods.updateFetchInfo = async function() {
  this.last_fetched = new Date();
  this.fetch_count += 1;
  this.is_stale = false;
  return this.save();
};

// Statics
ordinalSchema.statics.findByInscriptionId = function(inscriptionId) {
  return this.findOne({ 
    $or: [
      { inscription_id: inscriptionId },
      { inscription_number: inscriptionId }
    ]
  });
};

ordinalSchema.statics.findStale = function(hours = 24) {
  const staleDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    $or: [
      { last_fetched: { $lt: staleDate } },
      { is_stale: true }
    ]
  });
};

export default mongoose.model('Ordinal', ordinalSchema);
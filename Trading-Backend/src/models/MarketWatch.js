import mongoose from 'mongoose';

const marketWatchSchema = new mongoose.Schema({
  ordinal_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ordinal", 
    required: [true, 'Ordinal ID is required'],
    unique: true,
    index: true 
  },
  current_price_btc: { 
    type: Number,
    min: [0, 'Price cannot be negative'],
    index: true
  },
  last_checked_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  price_updated_at: { 
    type: Date,
    default: Date.now 
  },
});

// Index for price monitoring queries
marketWatchSchema.index({ last_checked_at: 1 });
marketWatchSchema.index({ current_price_btc: 1, last_checked_at: 1 });

// Auto-update timestamps
marketWatchSchema.pre('save', function(next) {
  const now = new Date();
  this.last_checked_at = now;
  
  if (this.isModified('current_price_btc')) {
    this.price_updated_at = now;
  }
  
  next();
});

// Static method to get ordinals needing price check
marketWatchSchema.statics.getStalePrices = function(hours = 1, limit = 100) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ 
    last_checked_at: { $lt: cutoffTime }
  })
  .populate('ordinal_id', 'inscription_id name image_url')
  .limit(limit)
  .exec();
};

export default mongoose.model('MarketWatch', marketWatchSchema);
import mongoose from 'mongoose';

const marketTriggerSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, 'User ID is required'],
    index: true 
  },
  ordinal_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ordinal", 
    required: [true, 'Ordinal ID is required'],
    index: true 
  },

  condition: { 
    type: String, 
    enum: {
      values: ["PRICE_BELOW", "PRICE_ABOVE"],
      message: '{VALUE} is not a valid condition'
    }, 
    required: [true, 'Condition is required'],
    index: true 
  },
  target_price_btc: { 
    type: Number, 
    required: [true, 'Target price is required'],
    min: [0.00001, 'Minimum target price is 0.00001 BTC']
  },

  // Bot control flags
  is_active: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  expires_at: { 
    type: Date,
    index: true,
    validate: {
      validator: function(v) {
        return !v || v > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  },

  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
});

// Compound indexes for optimized trigger queries
marketTriggerSchema.index({ is_active: 1, expires_at: 1 });
marketTriggerSchema.index({ user_id: 1, is_active: 1 });
marketTriggerSchema.index({ ordinal_id: 1, is_active: 1 });
marketTriggerSchema.index({ condition: 1, target_price_btc: 1 });

// Update timestamp on save
marketTriggerSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Auto-deactivate expired triggers
marketTriggerSchema.pre('save', function(next) {
  if (this.expires_at && new Date() > this.expires_at) {
    this.is_active = false;
  }
  next();
});

// Static method to get active triggers for a user
marketTriggerSchema.statics.getActiveUserTriggers = function(userId) {
  return this.find({ 
    user_id: userId, 
    is_active: true,
    $or: [
      { expires_at: { $exists: false } },
      { expires_at: { $gt: new Date() } }
    ]
  })
  .populate('ordinal_id', 'name image_url price_btc inscription_id')
  .sort({ created_at: -1 })
  .exec();
};

export default mongoose.model('MarketTrigger', marketTriggerSchema);
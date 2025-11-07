import mongoose from 'mongoose';

const ordinalSchema = new mongoose.Schema({
  inscription_id: { 
    type: String, 
    required: [true, 'Inscription ID is required'],
    unique: true, 
    index: true,
    trim: true
  },
  name: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
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
  price_btc: { 
    type: Number,
    min: [0, 'Price cannot be negative'],
    index: true
  },
  owner: { 
    type: String,
    trim: true,
    index: true
  },
  location: { 
    type: String,
    trim: true
  },
  value: { 
    type: Number,
    min: [0, 'Value cannot be negative']
  },
  Sat_Rarity: { 
    type: String,
    enum: {
      values: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'N/A'],
      message: '{VALUE} is not a valid rarity'
    },
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
  fetched_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
});

// Compound indexes for better query performance
ordinalSchema.index({ price_btc: 1, Sat_Rarity: 1 });
ordinalSchema.index({ owner: 1, fetched_at: -1 });
ordinalSchema.index({ content_type: 1, price_btc: 1 });

// Text search index for name
ordinalSchema.index({ name: 'text' });

// Update fetched_at on save
ordinalSchema.pre('save', function(next) {
  if (this.isModified('price_btc') || this.isModified('owner')) {
    this.fetched_at = new Date();
  }
  next();
});

// Instance method to check if ordinal is affordable
ordinalSchema.methods.isAffordable = function(userBalance) {
  return this.price_btc <= userBalance;
};

export default mongoose.model('Ordinal', ordinalSchema);
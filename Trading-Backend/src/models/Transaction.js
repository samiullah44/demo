import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
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

  type: { 
    type: String, 
    enum: {
      values: ["BUY", "SELL"],
      message: '{VALUE} is not a valid transaction type'
    }, 
    required: [true, 'Transaction type is required'],
    index: true 
  },
  price_btc: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0.00001, 'Minimum price is 0.00001 BTC']
  },
  tx_hash: { 
    type: String,
    trim: true,
    sparse: true, // Allow null for pending transactions
    index: true
  },
  status: { 
    type: String, 
    enum: {
      values: ["pending", "completed", "failed"],
      message: '{VALUE} is not a valid status'
    }, 
    default: "pending",
    index: true 
  },

  // Denormalized fields for performance
  ordinal_name: { 
    type: String,
    trim: true
  },
  user_wallet: { 
    type: String,
    trim: true,
    index: true
  },

  created_at: { type: Date, default: Date.now, index: true },
  executed_at: { type: Date },
  confirmed_at: { type: Date },
});

// Compound indexes for optimized queries
transactionSchema.index({ user_id: 1, status: 1, created_at: -1 });
transactionSchema.index({ ordinal_id: 1, type: 1 });
transactionSchema.index({ user_wallet: 1, created_at: -1 });
transactionSchema.index({ status: 1, created_at: -1 });

// Auto-set timestamps based on status changes
transactionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.status === 'completed' && !this.executed_at) {
    this.executed_at = now;
  }
  
  if (this.status === 'completed' && this.tx_hash && !this.confirmed_at) {
    this.confirmed_at = now;
  }
  
  next();
});

// Static method to get user transaction history
transactionSchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('ordinal_id', 'name image_url inscription_id')
    .exec();
};

export default mongoose.model('Transaction', transactionSchema);
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    index: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },password: {
  type: String,
  required: true,
  minlength: 6
},
  
 wallets: [{
    address: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    wallet_type: { 
      type: String, 
      enum: ["unisat", "xverse", "ordinalswallet", "hiro", "magiceden", "other"],
      required: true 
    },
    public_key: { type: String },
    network: { 
      type: String,
  enum: ["mainnet", "testnet", "livenet"],
  default: "mainnet"
    },
    is_primary: { type: Boolean, default: false },
    is_verified: { type: Boolean, default: false },
    connected_at: { type: Date, default: Date.now },
    last_used: { type: Date, default: Date.now }
  }],
  
  // Quick access
  primary_wallet: {
    address: String,
    wallet_type: String
  },
  // Existing fields
  balance_btc: { 
    type: Number, 
    default: 0,
    min: 0
  },
  auto_trade_enabled: { 
    type: Boolean, 
    default: false,
    index: true 
  },

  // Trading risk management
  trading_limits: {
    max_single_trade_btc: { 
      type: Number, 
      default: 0.1,
      min: 0.00001
    },
    max_daily_trade_btc: { 
      type: Number, 
      default: 1,
      min: 0.001
    },
  },

  // Notification preferences
  notifications: {
    email_alerts: { type: Boolean, default: true },
    push_alerts: { type: Boolean, default: true },
  },

  // User analytics
  trading_stats: {
    total_trades: { type: Number, default: 0, min: 0 },
    total_volume_btc: { type: Number, default: 0, min: 0 },
    successful_trades: { type: Number, default: 0, min: 0 },
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

userSchema.pre('save', function(next) {
  const primaryWallet = this.wallets.find(w => w.is_primary);
  this.primary_wallet_address = primaryWallet ? primaryWallet.address : null;
  this.updated_at = Date.now();
  next();
});

// Virtual for success rate
userSchema.virtual('success_rate').get(function() {
  if (this.trading_stats.total_trades === 0) return 0;
  return (this.trading_stats.successful_trades / this.trading_stats.total_trades) * 100;
});

userSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('User', userSchema);
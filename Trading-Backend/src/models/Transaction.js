const transactionSchema = new mongoose.Schema({
  // Transaction details
  tx_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tx_hex: {
    type: String,
    required: true
  },
  
  // Type
  type: {
    type: String,
    enum: ['purchase', 'listing', 'transfer', 'dummy_utxo'],
    required: true,
    index: true
  },
  
  // Relations
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  },
  ordinal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ordinal'
  },
  
  // Parties
  from_address: {
    type: String,
    required: true,
    index: true
  },
  to_address: {
    type: String,
    required: true,
    index: true
  },
  
  // Financial
  amount_sats: {
    type: Number,
    required: true,
    min: 0
  },
  fee_sats: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  confirmations: {
    type: Number,
    default: 0
  },
  
  // Blockchain data
  block_height: {
    type: Number,
    index: true
  },
  block_hash: {
    type: String
  },
  confirmed_at: {
    type: Date
  },
  
  // Error tracking
  error_message: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ from_address: 1, status: 1 });
transactionSchema.index({ to_address: 1, status: 1 });
transactionSchema.index({ type: 1, status: 1 });

// Methods
transactionSchema.methods.markConfirmed = async function(blockHeight, blockHash) {
  this.status = 'confirmed';
  this.block_height = blockHeight;
  this.block_hash = blockHash;
  this.confirmed_at = new Date();
  return this.save();
};

transactionSchema.methods.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.error_message = errorMessage;
  return this.save();
};

transactionSchema.methods.updateConfirmations = async function(confirmations) {
  this.confirmations = confirmations;
  return this.save();
};

export const Transaction = mongoose.model('Transaction', transactionSchema);

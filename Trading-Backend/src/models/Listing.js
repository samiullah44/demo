import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  // Relations
  ordinal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ordinal',
    required: true,
    index: true
  },
  collection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    index: true
  },
  
  // Inscription details - FIXED: Added unique constraint
  inscription_id: {
    type: String,
    required: true,
    index: true,
    // Add compound unique index for inscription_id + status
    // This allows multiple listings for same inscription if they're cancelled/sold
  },
  inscription_number: {
    type: String,
    index: true
  },
  inscription_output: {
    type: String,
    required: true
  },
  
  // Seller info
  seller_address: {
    type: String,
    required: true,
    index: true
  },
  payment_address: {
    type: String,
    required: true
  },
  
  // Pricing
  price_sats: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  price_btc: {
    type: Number,
    required: true,
    min: 0
  },
  
  // PSBT data
  unsigned_psbt: {
    type: String,
    required: true
  },
  signed_psbt: {
    type: String,
    required: true
  },
  
  // PSBT status tracking
  psbt_status: {
    is_partially_signed: Boolean,
    is_fully_signed: Boolean,
    can_finalize: Boolean,
    signature_count: Number,
    total_inputs: Number,
    finalization_ready: Boolean
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  
  // Sale info
  buyer_address: {
    type: String,
    default: null
  },
  sale_tx_id: {
    type: String,
    default: null
  },
  sold_at: {
    type: Date,
    default: null
  },
  cancelled_at: {
    type: Date,
    default: null
  },
  
  // Metadata
  views: {
    type: Number,
    default: 0
  },
  
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// CRITICAL: Compound unique index - only one active listing per inscription
listingSchema.index(
  { inscription_id: 1, status: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { status: 'active' } 
  }
);

// Other indexes
listingSchema.index({ status: 1, price_btc: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller_address: 1, status: 1 });
listingSchema.index({ collection: 1, status: 1, price_btc: 1 });

// Methods
listingSchema.methods.markAsSold = async function(buyerAddress, txId) {
  this.status = 'sold';
  this.buyer_address = buyerAddress;
  this.sale_tx_id = txId;
  this.sold_at = new Date();
  return this.save();
};

listingSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  this.cancelled_at = new Date();
  return this.save();
};

listingSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Statics
listingSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    expires_at: { $gt: new Date() }
  }).populate('ordinal collection');
};

listingSchema.statics.findByCollection = function(collectionId) {
  return this.find({ 
    collection: collectionId,
    status: 'active'
  }).populate('ordinal');
};

listingSchema.statics.expireOldListings = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      expires_at: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result.modifiedCount;
};

export const Listing = mongoose.model('Listing', listingSchema);
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
  _id: false // No _id for subdocuments to save space
});

const collectionSchema = new mongoose.Schema({
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
  inscriptions: [inscriptionSchema],
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for inscription count
collectionSchema.virtual('inscriptionCount').get(function() {
  return this.inscriptions ? this.inscriptions.length : 0;
});

// Index for better query performance
collectionSchema.index({ slug: 1, isActive: 1 });
collectionSchema.index({ lastFetched: -1 });
collectionSchema.index({ 'inscriptions.id': 1 });

// Static method to find or create collection
collectionSchema.statics.findOrCreate = async function(slug, collectionData = null) {
  let collection = await this.findOne({ slug, isActive: true });
  
  if (!collection && collectionData) {
    collection = new this({
      slug,
      name: collectionData.name || slug,
      inscriptions: collectionData.inscriptions || [],
      source: collectionData.source || 'github'
    });
    await collection.save();
  }
  
  return collection;
};

// Method to mark collection as errored
collectionSchema.methods.markErrored = function(errorMessage) {
  this.errorCount += 1;
  this.lastError = errorMessage.substring(0, 500); // Limit error message length
  return this.save();
};

export default mongoose.model('Collection', collectionSchema);
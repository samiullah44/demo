import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, 'User ID is required'],
    index: true 
  },
  message: { 
    type: String, 
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: { 
    type: String, 
    enum: {
      values: ["PRICE_ALERT", "TRADE_EXECUTED", "SYSTEM"],
      message: '{VALUE} is not a valid notification type'
    }, 
    default: "SYSTEM",
    index: true 
  },
  read: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  data: { 
    type: mongoose.Schema.Types.Mixed 
  },
  created_at: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
});

// Compound indexes for optimized notification queries
notificationSchema.index({ user_id: 1, read: 1, created_at: -1 });
notificationSchema.index({ type: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, type: 1, read: 1 });

// Static method to get unread notifications count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    user_id: userId, 
    read: false 
  }).exec();
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user_id: userId, read: false },
    { read: true }
  ).exec();
};

export default mongoose.model('Notification', notificationSchema);
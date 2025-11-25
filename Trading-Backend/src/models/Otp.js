import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Remove index from here
  createdAt: { type: Date, default: Date.now }
});

// Only define TTL index once here
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);
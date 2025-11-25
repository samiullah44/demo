import User from "../models/User.js";
import Otp from "../models/Otp.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.js"; // your existing util
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();

const OTP_TTL_MS = 3 * 60 * 1000; 

/**
 * Helper: generate numeric 6-digit OTP as string
 */
const generateOtpCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
};

/**
 * POST /api/auth
 * Body: { email, password }
 *
 * Behavior:
 *  - If user exists: verify password -> login -> return success + token
 *  - If user does NOT exist: create ephemeral OTP, send to email -> return { otp_sent: true }
 */
export const auth = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    // CASE A — User exists -> attempt login
    if (existingUser) {
      // Must have password saved for existing users
      if (!existingUser.password) {
        return res.status(400).json({ message: "Account exists but no password set. Use alternative login." });
      }

      const match = await bcrypt.compare(password, existingUser.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      // issue token (your generateToken may set cookie; adjust as needed)
      const token = generateToken(existingUser._id, res);

      // Return user info (don't leak password)
      return res.json({
        success: true,
        isNewUser: false,
        user: {
          _id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          profilePic: existingUser.profilePic || null,
        },
        token,
      });
    }

    // CASE B — User does not exist -> send OTP for verification & signup
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Store OTP in DB (ephemeral)
    await Otp.findOneAndUpdate(
  { email: normalizedEmail },
  { $set: { code, expiresAt, createdAt: new Date() } },
  { upsert: true, new: true }
);
     const html = `<p>Your TradePulse verification code is <strong>${code}</strong>. It expires in 3 minutes.</p>`;
    await sendEmail({
  to: normalizedEmail,
  subject: "Your TradePulse verification code",
  html,
  text: `Your TradePulse verification code is ${code}. It expires in 3 minutes.`,
});

    return res.json({
      success: true,
      otp_sent: true,
      message: "OTP sent to email. Check inbox (and spam).",
    });
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/verify
 * Body: { email, password, code }
 *
 * Verifies OTP -> creates user -> issues token
 */
export const verifyOtpAndSignup = async (req, res) => {
  try {
    const { email, password, code, name } = req.body;
    if (!email || !password || !code) {
      return res.status(400).json({ message: "Email, password and code are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`🔍 Verifying OTP for: ${normalizedEmail}`); // Debug log

    // Check otp entry
    const otpEntry = await Otp.findOne({ email: normalizedEmail });
    console.log(`📋 OTP Entry found:`, otpEntry); // Debug log
    
    if (!otpEntry) {
      console.log(`❌ No OTP request found for: ${normalizedEmail}`);
      return res.status(400).json({ message: "No OTP request found for this email." });
    }

    // Validate code + expiry
    if (otpEntry.code !== String(code)) {
      console.log(`❌ Invalid OTP: expected ${otpEntry.code}, got ${code}`);
      return res.status(400).json({ message: "Invalid OTP." });
    }
    
    if (otpEntry.expiresAt < new Date()) {
      console.log(`❌ OTP expired at: ${otpEntry.expiresAt}`);
      return res.status(400).json({ message: "OTP expired." });
    }

    console.log(`✅ OTP validated successfully`); // Debug log

    // DOUBLE CHECK if user exists (race condition protection)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log(`⚠️ User already exists during OTP verification: ${normalizedEmail}`);
      // Clean up OTP
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(400).json({ message: "User already exists. Please login instead." });
    }

    // Create user with error handling for race conditions
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      const newUser = new User({
        username: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashed,
        created_at: Date.now(),
      });

      await newUser.save();
      console.log(`✅ New user created: ${normalizedEmail}`); // Debug log

      // Remove OTP entry (cleanup)
      await Otp.deleteMany({ email: normalizedEmail });
      console.log(`🧹 OTP cleaned up for: ${normalizedEmail}`); // Debug log

      // Issue token
      const token = generateToken(newUser._id, res);

      return res.status(201).json({
        success: true,
        isNewUser: true,
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
        token,
        message: "Signup complete",
      });
    } catch (userError) {
      // Handle duplicate key error specifically
      if (userError.code === 11000) {
        console.log(`⚠️ Race condition: User created by another process`);
        await Otp.deleteMany({ email: normalizedEmail });
        return res.status(400).json({ message: "User already exists. Please login instead." });
      }
      throw userError; // Re-throw other errors
    }
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Logout error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth=(req,res)=>{
   try{
      res.status(200).json(req.user);
   }catch(error){
   console.log("Error in Check Auth controller",error.message);
    res.status(500).json({message:"Internal Server Error"});
   }
}
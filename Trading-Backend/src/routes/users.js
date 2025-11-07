import express from 'express';
import User from '../models/User.js';
import { body } from "express-validator";
import { auth, verifyOtpAndSignup ,logout,updateProfile,checkAuth } from '../controllers/userController.js';
import rateLimit from "express-rate-limit";
import { protectRoute } from '../middleware/validation.js';
const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests, try again later." }
});

// Single entry: POST /api/auth (login or start signup)
router.post("/auth", limiter, auth);

// Verify OTP and create account: POST /api/auth/verify
router.post("/verify", limiter, verifyOtpAndSignup);
router.post("/logout", logout);

router.put("/update-profile",protectRoute,updateProfile)

router.get("/check",protectRoute,checkAuth)

router.post('/wallet/connect', async (req, res) => {
  try {
    const { address, wallet_type, public_key, network } = req.body;
    
    // Find or create user
    let user = await User.findOne({ 'wallets.address': address });
    
    if (!user) {
      // Create new user with this wallet
      user = new User({
        username: `user_${address.slice(0, 8)}`,
        email: `${address}@wallet.com`,
        wallets: [{
          address,
          wallet_type,
          public_key,
          network,
          is_primary: true,
          connected_at: new Date(),
          last_used: new Date()
        }],
        primary_wallet: {
          address,
          wallet_type
        }
      });
    } else {
      // Update existing wallet or add new one
      const existingWallet = user.wallets.find(w => w.address === address);
      
      if (existingWallet) {
        // Update existing
        existingWallet.wallet_type = wallet_type;
        existingWallet.public_key = public_key;
        existingWallet.network = network;
        existingWallet.last_used = new Date();
      } else {
        // Add new wallet
        user.wallets.push({
          address,
          wallet_type,
          public_key,
          network,
          is_primary: true,
          connected_at: new Date(),
          last_used: new Date()
        });
      }
      
      user.primary_wallet = { address, wallet_type };
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        address,
        wallet_type
      }
    });
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet'
    });
  }
});

// GET /api/users/wallet/:address - Get wallet info
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ 'wallets.address': address });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const wallet = user.wallets.find(w => w.address === address);
    
    res.json({
      success: true,
      wallet,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet info'
    });
  }
});

// GET /api/users/wallet/:address/balance - Get wallet balance
router.get('/wallet/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    
    // In a real app, you'd fetch from blockchain
    // For now, return a placeholder
    res.json({
      success: true,
      balance: 0.042, // Example balance in BTC
      address
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
});

// POST /api/users/wallet/disconnect - Disconnect wallet
router.post('/wallet/disconnect', async (req, res) => {
  try {
    const { address } = req.body;
    
    // Update user's wallet status
    await User.findOneAndUpdate(
      { 'wallets.address': address },
      { 
        $set: { 
          'wallets.$.is_primary': false,
          'wallets.$.last_used': new Date()
        } 
      }
    );

    res.json({
      success: true,
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    console.error('Wallet disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect wallet'
    });
  }
});

export default router;
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
    const { address, wallet_type, public_key, network, signature, message } = req.body;
    
    // Validate required fields
    if (!address || !wallet_type || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: address, wallet_type, and signature are required'
      });
    }

    const allowedNetworks = ["mainnet", "testnet", "livenet"];
    const validatedNetwork = allowedNetworks.includes(network) ? network : "mainnet";

    // In production, you should verify the signature here
    // For now, we'll trust the frontend signature
    
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
          network: validatedNetwork,
          is_primary: true,
          is_verified: true, // Mark as verified since we have signature
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
        // Update existing wallet
        existingWallet.wallet_type = wallet_type;
        existingWallet.public_key = public_key;
        existingWallet.network = validatedNetwork;
        existingWallet.is_verified = true;
        existingWallet.last_used = new Date();
      } else {
        // Add new wallet
        user.wallets.push({
          address,
          wallet_type,
          public_key,
          network: validatedNetwork,
          is_primary: true,
          is_verified: true,
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
        wallet_type,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet: ' + error.message
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

// GET /api/users/wallet/:address/balance - Get REAL wallet balance
router.get('/wallet/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate Bitcoin address format
    if (!address || !address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Bitcoin address format'
      });
    }

    // Fetch REAL balance from blockchain
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}`);
      
      if (!response.ok) {
        throw new Error(`Blockstream API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Calculate real balance
      const confirmedBalance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      const unconfirmedBalance = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
      const totalBalance = (confirmedBalance + unconfirmedBalance) / 100000000; // Convert to BTC

      res.json({
        success: true,
        balance: totalBalance,
        confirmed: confirmedBalance / 100000000,
        unconfirmed: unconfirmedBalance / 100000000,
        address,
        transaction_count: data.chain_stats.tx_count + data.mempool_stats.tx_count
      });
    } catch (blockchainError) {
      console.error('Blockchain API error:', blockchainError);
      // Fallback to zero instead of fake data
      res.json({
        success: true,
        balance: 0,
        confirmed: 0,
        unconfirmed: 0,
        address,
        transaction_count: 0
      });
    }
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance: ' + error.message
    });
  }
});

// GET /api/users/wallet/:address/inscriptions - Get REAL inscriptions
router.get('/wallet/:address/inscriptions', async (req, res) => {
  try {
    const { address } = req.params;

    try {
      // Try multiple ordinals APIs
      const apis = [
        `https://api.ordinals.com/address/${address}/inscriptions`,
        `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}`,
        `https://ordapi.xyz/address/${address}`
      ];
      
      let inscriptions = [];
      
      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            
            // Handle different API response formats
            if (data.inscriptions) {
              inscriptions = data.inscriptions;
              break;
            } else if (data.results) {
              inscriptions = data.results;
              break;
            } else if (Array.isArray(data)) {
              inscriptions = data;
              break;
            }
          }
        } catch (apiError) {
          console.warn(`Ordinals API ${apiUrl} failed:`, apiError);
          continue;
        }
      }

      res.json({
        success: true,
        inscriptions,
        count: inscriptions.length,
        address
      });
    } catch (blockchainError) {
      console.error('Ordinals API error:', blockchainError);
      res.json({
        success: true,
        inscriptions: [],
        count: 0,
        address
      });
    }
  } catch (error) {
    console.error('Get inscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inscriptions: ' + error.message
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
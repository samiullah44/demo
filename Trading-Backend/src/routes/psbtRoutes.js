import express from 'express';
import {
  generateSellerPSBT,
  generateBuyerPSBT,
  verifyOwnership,
  validatePSBT,
  broadcastPSBT
} from '../controllers/psbtController.js';
import { validatePSBTRequest, validateOwnershipRequest } from '../middleware/validations.js';

const router = express.Router();
router.get('/health', (req, res) => {
  res.json({ status: 'PSBT routes are healthy' });
});

// Generate PSBT for seller to list an ordinal
router.post('/generate-seller', generateSellerPSBT);

// Generate PSBT for buyer to purchase a listed ordinal
router.post('/generate-buyer', generateBuyerPSBT);

// Verify ownership of an inscription
router.post('/verify-ownership', validateOwnershipRequest, verifyOwnership);

// Validate a PSBT
router.post('/validate', validatePSBTRequest, validatePSBT);

// Broadcast a signed PSBT
router.post('/broadcast', broadcastPSBT);

export default router;
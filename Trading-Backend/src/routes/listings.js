import express from 'express';
import {
  createListing,
  getAllListings,
  getListingById,
  // updateListing,
  cancelListing,
  getListingsByCollection,
  getListingsBySeller,
  purchaseListing
} from '../controllers/listingController.js';
import { validateListing, validatePurchase } from '../middleware/validations.js';

const router = express.Router();

// Public routes
router.get('/', getAllListings);
router.get('/:id', getListingById);
router.get('/collection/:collectionId', getListingsByCollection);
router.get('/seller/:address', getListingsBySeller);

// Protected routes (require wallet signature verification)
router.post('/', validateListing, createListing);
// router.put('/:id', validateListing, updateListing);
router.delete('/:id', cancelListing);
router.post('/:id/purchase', validatePurchase, purchaseListing);

export default router;
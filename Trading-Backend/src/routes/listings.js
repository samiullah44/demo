import express from 'express';

const listingRouter = express.Router();

import {
  getAllListings,
  getListingById,
  cancelListing,
  getListingsByCollection,
  getListingsBySeller,
  purchaseListing
} from '../controllers/listingController.js';

// Public routes
listingRouter.get('/', getAllListings);
listingRouter.get('/:id', getListingById);
listingRouter.get('/collection/:collectionId', getListingsByCollection);
listingRouter.get('/seller/:address', getListingsBySeller);

// Protected routes
listingRouter.delete('/:id', cancelListing);

/**
 * Purchase listing (complete the purchase)
 * Body: {
 *   buyer_address: string,
 *   receiver_address?: string,
 *   signed_buyer_psbt: string (base64 or hex)
 * }
 */
listingRouter.post('/:id/purchase', purchaseListing);

export default listingRouter;
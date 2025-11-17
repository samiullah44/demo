import express from 'express';
import {
  getAllOrdinals,
  getOrdinalById,
  // getOrdinalsByOwner,
  // getOrdinalsByCollection,
  // verifyOwnership,
  // updateOrdinalMetadata
} from '../controllers/ordinalController.js';

const router = express.Router();

router.get('/', getAllOrdinals);
router.get('/:inscriptionId', getOrdinalById);
// router.get('/owner/:address', getOrdinalsByOwner);
// router.get('/collection/:collectionSlug', getOrdinalsByCollection);
// router.post('/verify-ownership', verifyOwnership);
// router.put('/:inscriptionId/metadata', updateOrdinalMetadata);

export default router;
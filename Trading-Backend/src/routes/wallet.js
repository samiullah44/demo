import express from 'express';
import {
  getWalletData,
  getWalletOrdinals,
  getWalletListings,
  generateDummyUtxoPSBT
} from '../controllers/walletController.js';

const router = express.Router();

router.get('/:address', getWalletData);
router.get('/:address/ordinals', getWalletOrdinals);
router.get('/:address/listings', getWalletListings);
router.post('/:address/generate-dummy-utxo', generateDummyUtxoPSBT);

export default router;
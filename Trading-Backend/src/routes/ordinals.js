import express from 'express';
import {
  getAllOrdinals,
  getOrdinalById,
  refreshOrdinalData
} from '../controllers/ordinalController.js';

const router = express.Router();

router.get('/', getAllOrdinals);
router.get('/:inscriptionId', getOrdinalById);
router.post('/:inscriptionId/refresh', refreshOrdinalData);

export default router;
import { AppError } from './errorHandler.js';

export const validateListing = (req, res, next) => {
  const {
    inscription_id,
    price_sats,
    seller_address,
    signed_psbt
  } = req.body;

  const errors = [];

  if (!inscription_id || inscription_id.length < 10) {
    errors.push('Valid inscription_id is required');
  }

  if (!price_sats || price_sats < 10000) {
    errors.push('Price must be at least 10,000 sats');
  }

  if (!seller_address || !seller_address.startsWith('bc1')) {
    errors.push('Valid Bitcoin address required');
  }

  if (!signed_psbt) {
    errors.push('Signed PSBT is required');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(', '), 400);
  }

  next();
};

export const validatePurchase = (req, res, next) => {
  const { buyer_address, signed_buyer_psbt } = req.body;

  if (!buyer_address || !buyer_address.startsWith('bc1')) {
    throw new AppError('Valid buyer address required', 400);
  }

  if (!signed_buyer_psbt) {
    throw new AppError('Signed buyer PSBT required', 400);
  }

  next();
};

export const validatePSBTRequest = (req, res, next) => {
  const { psbt_base64, inscription_output } = req.body;

  const errors = [];

  if (!psbt_base64) {
    errors.push('psbt_base64 is required');
  }

  if (!inscription_output) {
    errors.push('inscription_output is required');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(', '), 400);
  }

  next();
};

export const validateOwnershipRequest = (req, res, next) => {
  const { inscription_id, address } = req.body;

  const errors = [];

  if (!inscription_id) {
    errors.push('inscription_id is required');
  }

  if (!address) {
    errors.push('address is required');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(', '), 400);
  }

  next();
};
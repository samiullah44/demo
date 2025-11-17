import { Listing } from '../models/Listing.js';
import Ordinal from '../models/Ordinal.js';
import Collection from '../models/Collection.js';
import { 
  verifyOwnership, 
  generateSellerPSBT, 
  generateBuyerPSBT,
  validatePSBT 
} from '../services/psbtService.js';
import { broadcastTx } from '../services/mempoolService.js';
import { AppError } from '../middleware/errorHandler.js';

export const createListing = async (req, res, next) => {
  try {
    const {
      inscription_id,
      inscription_number,
      inscription_output,
      price_sats,
      price_btc,
      seller_address,
      payment_address,
      signed_psbt
    } = req.body;

    // 1. Verify ownership
    const isOwner = await verifyOwnership(inscription_id, seller_address);
    if (!isOwner) {
      throw new AppError('You are not the owner of this inscription', 403);
    }

    // 2. Validate PSBT
    const isValid = await validatePSBT(signed_psbt, inscription_output, price_sats);
    if (!isValid) {
      throw new AppError('Invalid or improperly signed PSBT', 400);
    }

    // 3. Find or create ordinal
    let ordinal = await Ordinal.findOne({ inscription_id });
    if (!ordinal) {
      // Fetch inscription data and create ordinal
      const inscriptionData = await getInscriptionData(inscription_id);
      ordinal = new Ordinal({
        inscription_id,
        inscription_number: inscription_number || inscriptionData.number,
        owner: seller_address,
        output: inscription_output,
        ...inscriptionData
      });
      await ordinal.save();
    }

    // 4. Check if ordinal belongs to a collection
    let collection = null;
    if (ordinal.collection_slug) {
      collection = await Collection.findOne({ slug: ordinal.collection_slug });
    }

    // 5. Create listing
    const listing = new Listing({
      ordinal: ordinal._id,
      collection: collection?._id,
      inscription_id,
      inscription_number: inscription_number || ordinal.inscription_number,
      inscription_output,
      seller_address,
      payment_address: payment_address || seller_address,
      price_sats,
      price_btc,
      unsigned_psbt: '', // We don't store unsigned, only signed
      signed_psbt
    });

    await listing.save();

    // 6. Update ordinal listing status
    await ordinal.updateListing(listing._id, price_btc);

    // 7. Update collection floor price if applicable
    if (collection) {
      await collection.updateFloorPrice();
    }

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: {
        listing: await listing.populate('ordinal collection')
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = '-createdAt',
      minPrice,
      maxPrice,
      collection,
      rarity,
      status = 'active'
    } = req.query;

    const query = { status };

    // Price filter
    if (minPrice || maxPrice) {
      query.price_btc = {};
      if (minPrice) query.price_btc.$gte = parseFloat(minPrice);
      if (maxPrice) query.price_btc.$lte = parseFloat(maxPrice);
    }

    // Collection filter
    if (collection) {
      const col = await Collection.findOne({ slug: collection });
      if (col) query.collection = col._id;
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('ordinal collection')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments(query)
    ]);

    // Filter by rarity if needed (after population)
    let filteredListings = listings;
    if (rarity) {
      filteredListings = listings.filter(l => 
        l.ordinal?.Sat_Rarity?.toLowerCase() === rarity.toLowerCase()
      );
    }

    res.json({
      success: true,
      data: {
        listings: filteredListings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate('ordinal collection');

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    // Increment views
    await listing.incrementViews();

    res.json({
      success: true,
      data: { listing }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seller_address } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    // Verify ownership
    if (listing.seller_address !== seller_address) {
      throw new AppError('Not authorized to cancel this listing', 403);
    }

    // Cancel listing
    await listing.cancel();

    // Update ordinal
    const ordinal = await Ordinal.findById(listing.ordinal);
    if (ordinal) {
      await ordinal.removeListing();
    }

    // Update collection floor price
    if (listing.collection) {
      const collection = await Collection.findById(listing.collection);
      await collection.updateFloorPrice();
    }

    res.json({
      success: true,
      message: 'Listing cancelled successfully',
      data: { listing }
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buyer_address, receiver_address, signed_buyer_psbt } = req.body;

    const listing = await Listing.findById(id).populate('ordinal');

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.status !== 'active') {
      throw new AppError('Listing is no longer active', 400);
    }

    // Extract and broadcast transaction
    const bitcoin = await import('bitcoinjs-lib');
    const psbt = bitcoin.Psbt.fromBase64(signed_buyer_psbt);
    
    // Finalize if needed
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        psbt.finalizeInput(i);
      } catch (e) {
        // Already finalized or doesn't need finalization
      }
    }

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txId = tx.getId();

    // Broadcast transaction
    await broadcastTx(txHex);

    // Mark listing as sold
    await listing.markAsSold(buyer_address, txId);

    // Update ordinal owner
    const ordinal = listing.ordinal;
    ordinal.owner = receiver_address || buyer_address;
    ordinal.last_sale_price = listing.price_btc;
    await ordinal.removeListing();

    // Create transaction record
    const Transaction = (await import('../models/Transaction.js')).Transaction;
    await Transaction.create({
      tx_id: txId,
      tx_hex: txHex,
      type: 'purchase',
      listing: listing._id,
      ordinal: ordinal._id,
      from_address: listing.seller_address,
      to_address: receiver_address || buyer_address,
      amount_sats: listing.price_sats,
      fee_sats: 0 // Calculate from tx
    });

    // Update collection stats
    if (listing.collection) {
      const collection = await Collection.findById(listing.collection);
      collection.sales_24h += 1;
      collection.volume_24h += listing.price_btc;
      await collection.updateFloorPrice();
      await collection.save();
    }

    res.json({
      success: true,
      message: 'Purchase successful',
      data: {
        txId,
        explorerUrl: `https://mempool.space${process.env.NODE_ENV === 'production' ? '' : '/signet'}/tx/${txId}`
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingsByCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const { page = 1, limit = 50, sort = 'price_btc' } = req.query;

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.findByCollection(collectionId)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments({ collection: collectionId, status: 'active' })
    ]);

    res.json({
      success: true,
      data: {
        listings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingsBySeller = async (req, res, next) => {
  try {
    const { address } = req.params;
    const { status = 'active' } = req.query;

    const listings = await Listing.find({
      seller_address: address,
      status
    }).populate('ordinal collection');

    res.json({
      success: true,
      data: { listings }
    });
  } catch (error) {
    next(error);
  }
};
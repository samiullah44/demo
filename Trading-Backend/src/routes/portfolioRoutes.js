import express from 'express';
import Ordinal from '../models/Ordinal.js';
import { Listing } from '../models/Listing.js'; // Updated import
import User from '../models/User.js';
import { protectRoute } from '../middleware/validation.js';

const router = express.Router();

// GET /api/portfolio/:address/stats - Get portfolio statistics
router.get('/:address/stats', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Get user's ordinals
    const userOrdinals = await Ordinal.find({ owner: address });
    
    // Get active listings for this user
    const activeListings = await Listing.find({ 
      seller_address: address, 
      status: 'active' 
    }).populate('ordinal');

    // Calculate portfolio statistics
    const totalValue = activeListings.reduce((sum, listing) => 
      sum + (listing.price_btc || 0), 0
    );
    
    const totalInvested = userOrdinals.reduce((sum, ordinal) => 
      sum + (ordinal.purchase_price || 0), 0
    );
    
    const totalProfit = totalValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Calculate average holding time
    const now = new Date();
    const totalHoldingTime = userOrdinals.reduce((sum, ordinal) => {
      const acquiredDate = new Date(ordinal.timestamp || ordinal.createdAt || now);
      const holdingDays = (now - acquiredDate) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, holdingDays);
    }, 0);
    
    const avgHoldingTime = userOrdinals.length > 0 ? totalHoldingTime / userOrdinals.length : 0;

    // Find best and worst performers based on listing prices vs purchase prices
    const performers = userOrdinals
      .filter(ordinal => ordinal.purchase_price)
      .map(ordinal => {
        const activeListing = activeListings.find(listing => 
          listing.inscription_id === ordinal.inscription_id
        );
        const currentValue = activeListing ? activeListing.price_btc : 0;
        const profit = currentValue - ordinal.purchase_price;
        const profitPercentage = ordinal.purchase_price ? (profit / ordinal.purchase_price) * 100 : 0;

        return {
          ...ordinal.toObject(),
          current_value: currentValue,
          profit,
          profitPercentage
        };
      })
      .filter(ordinal => ordinal.current_value > 0) // Only include listed ordinals
      .sort((a, b) => b.profitPercentage - a.profitPercentage);

    const bestPerformer = performers[0];
    const worstPerformer = performers[performers.length - 1];

    // Calculate portfolio diversity (rarity distribution)
    const rarityCount = userOrdinals.reduce((acc, ordinal) => {
      const rarity = ordinal.Sat_Rarity?.toLowerCase() || 'unknown';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {});
    
    const portfolioDiversity = Object.keys(rarityCount).length / Math.max(userOrdinals.length, 1);

    // Get recent sales for this user
    const recentSales = await Listing.find({
      seller_address: address,
      status: 'sold'
    })
    .sort({ sold_at: -1 })
    .limit(5)
    .populate('ordinal');

    // Calculate total sales volume
    const totalSalesVolume = recentSales.reduce((sum, sale) => 
      sum + (sale.price_btc || 0), 0
    );

    res.json({
      success: true,
      stats: {
        total_value: totalValue,
        total_invested: totalInvested,
        total_profit: totalProfit,
        profit_percentage: profitPercentage,
        total_items: userOrdinals.length,
        listed_items: activeListings.length,
        unlisted_items: userOrdinals.length - activeListings.length,
        avg_holding_time: avgHoldingTime,
        portfolio_diversity: portfolioDiversity * 100,
        total_sales_volume: totalSalesVolume,
        total_sales_count: recentSales.length,
        best_performer: bestPerformer ? {
          inscription_id: bestPerformer.inscription_id,
          name: bestPerformer.name,
          profit_percentage: bestPerformer.profitPercentage,
          profit_btc: bestPerformer.profit,
          current_value: bestPerformer.current_value,
          purchase_price: bestPerformer.purchase_price
        } : null,
        worst_performer: worstPerformer && worstPerformer.profitPercentage < 0 ? {
          inscription_id: worstPerformer.inscription_id,
          name: worstPerformer.name,
          profit_percentage: worstPerformer.profitPercentage,
          profit_btc: worstPerformer.profit,
          current_value: worstPerformer.current_value,
          purchase_price: worstPerformer.purchase_price
        } : null,
        recent_sales_count: recentSales.length,
        rarity_distribution: rarityCount,
        active_listings_value: totalValue
      }
    });

  } catch (error) {
    console.error('Portfolio stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio statistics: ' + error.message
    });
  }
});

// GET /api/portfolio/:address/history - Get portfolio performance history
router.get('/:address/history', async (req, res) => {
  try {
    const { address } = req.params;
    const { timeframe = '7d' } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get sales history for this user
    const salesHistory = await Listing.find({
      seller_address: address,
      status: 'sold',
      sold_at: { $gte: startDate }
    })
    .sort({ sold_at: 1 })
    .populate('ordinal');

    // Get listing history
    const listingHistory = await Listing.find({
      seller_address: address,
      createdAt: { $gte: startDate }
    })
    .sort({ createdAt: 1 });

    // Generate daily portfolio value history
    const history = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get active listings on this date
      const listingsOnDate = await Listing.find({
        seller_address: address,
        status: 'active',
        $or: [
          { createdAt: { $lte: currentDate } },
          { expires_at: { $gte: currentDate } }
        ]
      }).populate('ordinal');

      const portfolioValue = listingsOnDate.reduce((sum, listing) => 
        sum + (listing.price_btc || 0), 0
      );

      // Get sales on this date
      const salesOnDate = salesHistory.filter(sale => 
        sale.sold_at && sale.sold_at.toISOString().split('T')[0] === dateStr
      );

      // Get user ordinals count on this date
      const ordinalsOnDate = await Ordinal.countDocuments({
        owner: address,
        $or: [
          { timestamp: { $lte: currentDate } },
          { createdAt: { $lte: currentDate } }
        ]
      });

      history.push({
        date: dateStr,
        portfolio_value: portfolioValue,
        total_items: ordinalsOnDate,
        listed_items: listingsOnDate.length,
        sales_count: salesOnDate.length,
        sales_volume: salesOnDate.reduce((sum, sale) => sum + (sale.price_btc || 0), 0)
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      history,
      timeframe,
      summary: {
        total_sales: salesHistory.length,
        total_volume: salesHistory.reduce((sum, sale) => sum + (sale.price_btc || 0), 0),
        avg_sale_price: salesHistory.length > 0 ? 
          salesHistory.reduce((sum, sale) => sum + (sale.price_btc || 0), 0) / salesHistory.length : 0,
        active_listings: await Listing.countDocuments({ 
          seller_address: address, 
          status: 'active' 
        }),
        new_listings: listingHistory.filter(listing => listing.status === 'active').length
      }
    });

  } catch (error) {
    console.error('Portfolio history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio history: ' + error.message
    });
  }
});

// GET /api/portfolio/:address/ordinals - Get user's ordinals with portfolio data
router.get('/:address/ordinals', async (req, res) => {
  try {
    const { address } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      filter = 'all' 
    } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Build query based on filter
    let query = { owner: address };
    
    switch (filter) {
      case 'listed':
        // Find ordinals that have active listings
        const listedOrdinalIds = await Listing.find({
          seller_address: address,
          status: 'active'
        }).distinct('ordinal');
        
        query._id = { $in: listedOrdinalIds };
        break;
      case 'unlisted':
        // Find ordinals that don't have active listings
        const listedOrdinalIds2 = await Listing.find({
          seller_address: address,
          status: 'active'
        }).distinct('ordinal');
        
        query._id = { $nin: listedOrdinalIds2 };
        break;
      // 'all' includes everything
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get ordinals with pagination
    const ordinals = await Ordinal.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('collection')
      .lean();

    // Get active listings for these ordinals
    const activeListings = await Listing.find({
      ordinal: { $in: ordinals.map(o => o._id) },
      status: 'active'
    });

    // Enhance ordinals with listing data
    const enhancedOrdinals = ordinals.map(ordinal => {
      const activeListing = activeListings.find(listing => 
        listing.ordinal?.toString() === ordinal._id.toString()
      );
      
      const daysHeld = ordinal.timestamp ? 
        Math.floor((new Date() - new Date(ordinal.timestamp)) / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...ordinal,
        is_listed: !!activeListing,
        listing_data: activeListing ? {
          listing_id: activeListing._id,
          price_btc: activeListing.price_btc,
          price_sats: activeListing.price_sats,
          created_at: activeListing.createdAt,
          expires_at: activeListing.expires_at,
          views: activeListing.views
        } : null,
        portfolio_data: {
          is_listed: !!activeListing,
          days_held: daysHeld,
          current_value: activeListing ? activeListing.price_btc : 0,
          profit_loss: ordinal.purchase_price ? 
            (activeListing ? activeListing.price_btc : 0) - ordinal.purchase_price : 0,
          profit_loss_percentage: ordinal.purchase_price && activeListing ?
            ((activeListing.price_btc - ordinal.purchase_price) / ordinal.purchase_price) * 100 : 0
        }
      };
    });

    // Get total count for pagination
    const total = await Ordinal.countDocuments(query);

    // Get counts for filters
    const listedOrdinalIds = await Listing.find({
      seller_address: address,
      status: 'active'
    }).distinct('ordinal');
    
    const listedCount = await Ordinal.countDocuments({ 
      owner: address, 
      _id: { $in: listedOrdinalIds } 
    });
    
    const unlistedCount = await Ordinal.countDocuments({ 
      owner: address, 
      _id: { $nin: listedOrdinalIds } 
    });

    res.json({
      success: true,
      ordinals: enhancedOrdinals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        total_ordinals: total,
        listed_count: listedCount,
        unlisted_count: unlistedCount
      }
    });

  } catch (error) {
    console.error('User ordinals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user ordinals: ' + error.message
    });
  }
});

// POST /api/portfolio/quick-list - Quick list ordinal from portfolio
router.post('/quick-list', protectRoute, async (req, res) => {
  try {
    const {
      inscription_id,
      inscription_output,
      price_btc,
      price_sats,
      seller_address,
      payment_address,
      signed_psbt
    } = req.body;

    // Validate required fields
    if (!inscription_id || !price_btc || !seller_address || !signed_psbt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inscription_id, price_btc, seller_address, and signed_psbt are required'
      });
    }

    // Verify ownership and get ordinal
    const ordinal = await Ordinal.findOne({ 
      inscription_id, 
      owner: seller_address 
    });

    if (!ordinal) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this ordinal or it does not exist'
      });
    }

    // Check if already listed
    const existingListing = await Listing.findOne({
      inscription_id,
      status: 'active'
    });

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: 'This ordinal is already listed for sale'
      });
    }

    // Create listing record
    const listing = new Listing({
      ordinal: ordinal._id,
      inscription_id,
      inscription_number: ordinal.inscription_number,
      inscription_output,
      price_btc: parseFloat(price_btc),
      price_sats: parseInt(price_sats),
      seller_address,
      payment_address: payment_address || seller_address,
      signed_psbt,
      unsigned_psbt: signed_psbt, // You might want to generate this separately
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await listing.save();

    // Update ordinal with listing reference
    ordinal.is_listed = true;
    ordinal.listing_id = listing._id;
    await ordinal.save();

    res.json({
      success: true,
      message: 'Ordinal listed successfully',
      listing: {
        id: listing._id,
        inscription_id,
        price_btc: listing.price_btc,
        price_sats: listing.price_sats,
        status: 'active',
        expires_at: listing.expires_at
      },
      ordinal: {
        inscription_id,
        name: ordinal.name,
        is_listed: true,
        price_btc: listing.price_btc
      }
    });

  } catch (error) {
    console.error('Quick list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list ordinal: ' + error.message
    });
  }
});

// GET /api/portfolio/:address/performance - Get detailed performance metrics
router.get('/:address/performance', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Get all user ordinals
    const userOrdinals = await Ordinal.find({ owner: address });
    
    // Get sales history
    const sales = await Listing.find({ 
      seller_address: address, 
      status: 'sold' 
    }).populate('ordinal');

    // Get active listings
    const activeListings = await Listing.find({ 
      seller_address: address, 
      status: 'active' 
    }).populate('ordinal');

    // Calculate performance metrics
    const totalInvested = userOrdinals.reduce((sum, ordinal) => 
      sum + (ordinal.purchase_price || 0), 0
    );

    const totalSales = sales.reduce((sum, sale) => 
      sum + (sale.price_btc || 0), 0
    );

    const currentPortfolioValue = activeListings.reduce((sum, listing) => 
      sum + (listing.price_btc || 0), 0
    );

    const totalReturn = totalSales + currentPortfolioValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Calculate ROI by rarity
    const roiByRarity = {};
    userOrdinals.forEach(ordinal => {
      const rarity = ordinal.Sat_Rarity || 'unknown';
      if (!roiByRarity[rarity]) {
        roiByRarity[rarity] = {
          count: 0,
          total_invested: 0,
          total_value: 0,
          total_sales: 0
        };
      }
      
      roiByRarity[rarity].count++;
      roiByRarity[rarity].total_invested += ordinal.purchase_price || 0;
      
      // Add current value if listed
      const activeListing = activeListings.find(listing => 
        listing.ordinal?._id.toString() === ordinal._id.toString()
      );
      if (activeListing) {
        roiByRarity[rarity].total_value += activeListing.price_btc || 0;
      }
      
      // Add sales value if sold
      const sale = sales.find(s => 
        s.ordinal?._id.toString() === ordinal._id.toString()
      );
      if (sale) {
        roiByRarity[rarity].total_sales += sale.price_btc || 0;
      }
    });

    // Calculate holding period analysis
    const holdingPeriods = userOrdinals.map(ordinal => {
      const acquiredDate = new Date(ordinal.timestamp || ordinal.createdAt);
      const holdingDays = (new Date() - acquiredDate) / (1000 * 60 * 60 * 24);
      return Math.max(0, holdingDays);
    });

    const avgHoldingPeriod = holdingPeriods.length > 0 ? 
      holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length : 0;

    res.json({
      success: true,
      performance: {
        total_invested: totalInvested,
        total_sales: totalSales,
        current_portfolio_value: currentPortfolioValue,
        total_return: totalReturn,
        total_return_percentage: totalReturnPercentage,
        avg_holding_period: avgHoldingPeriod,
        total_ordinals: userOrdinals.length,
        sold_ordinals: sales.length,
        active_listings: activeListings.length,
        roi_by_rarity: roiByRarity,
        sales_analysis: {
          total_sales: sales.length,
          avg_sale_price: sales.length > 0 ? totalSales / sales.length : 0,
          highest_sale: sales.length > 0 ? Math.max(...sales.map(s => s.price_btc || 0)) : 0,
          lowest_sale: sales.length > 0 ? Math.min(...sales.map(s => s.price_btc || 0)) : 0,
          total_volume: totalSales
        },
        portfolio_health: {
          listing_success_rate: userOrdinals.length > 0 ? 
            (activeListings.length / userOrdinals.length) * 100 : 0,
          sales_conversion_rate: activeListings.length > 0 ? 
            (sales.length / (activeListings.length + sales.length)) * 100 : 0,
          avg_listing_duration: activeListings.length > 0 ?
            activeListings.reduce((sum, listing) => {
              const duration = (new Date() - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24);
              return sum + duration;
            }, 0) / activeListings.length : 0
        }
      }
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics: ' + error.message
    });
  }
});

export default router;
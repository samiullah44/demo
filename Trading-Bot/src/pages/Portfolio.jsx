import React, { useState, useEffect } from 'react';
import { 
  Bitcoin, TrendingUp, TrendingDown, Eye, DollarSign, Package, 
  List, Loader, AlertCircle, ExternalLink, Calendar,
  Users, BarChart3, Crown, Sparkles, Zap, Target,
  ArrowUpRight, ArrowDownRight, History, RefreshCw
} from 'lucide-react';
import useWalletStore from '../store/useWalletStore';
import useOrdinalStore from '../store/useOrdinalStore';
import usePSBTStore from '../store/usePSBTStore';
import ListOrdinalModal from '../components/ListOrdinalModal';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrdinalForListing, setSelectedOrdinalForListing] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedOrdinalDetail, setSelectedOrdinalDetail] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const { connected, address, connectWallet, walletType } = useWalletStore();
  const { 
    userOrdinals, 
    portfolioStats, 
    portfolioHistory,
    loading: ordinalsLoading,
    error: ordinalsError,
    getUserOrdinals,
    refreshPortfolio
  } = useOrdinalStore();
  
  const { listingInProgress } = usePSBTStore();

  useEffect(() => {
    if (connected && address) {
      getUserOrdinals(address);
    }
  }, [connected, address, getUserOrdinals]);

  const handleRefresh = async () => {
    if (!address) return;
    
    setRefreshing(true);
    try {
      await refreshPortfolio(address);
      toast.success('Portfolio updated!');
    } catch (error) {
      toast.error('Failed to refresh portfolio');
    } finally {
      setRefreshing(false);
    }
  };

  const handleListClick = (ordinal) => {
    if (!connected) {
      toast.error('Please connect your wallet to list ordinals');
      return;
    }
    setSelectedOrdinalForListing(ordinal);
    setShowListModal(true);
  };

  const handleListed = () => {
    setShowListModal(false);
    setSelectedOrdinalForListing(null);
    if (address) {
      refreshPortfolio(address);
    }
    toast.success('Ordinal listed successfully!');
  };

  // Enhanced portfolio statistics
  const calculateEnhancedStats = () => {
    if (!userOrdinals || userOrdinals.length === 0) {
      return {
        totalValue: 0,
        totalInvested: 0,
        totalProfit: 0,
        profitPercentage: 0,
        totalItems: 0,
        listedItems: 0,
        avgHoldingTime: 0,
        bestPerformer: null,
        worstPerformer: null,
        portfolioDiversity: 0
      };
    }

    const now = new Date();
    const listedItems = userOrdinals.filter(ordinal => ordinal.price_btc);
    const totalValue = listedItems.reduce((sum, item) => sum + (item.price_btc || 0), 0);
    const totalInvested = userOrdinals.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const totalProfit = totalValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Calculate average holding time
    const totalHoldingTime = userOrdinals.reduce((sum, item) => {
      const acquiredDate = new Date(item.timestamp || item.purchase_date || now);
      const holdingDays = (now - acquiredDate) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, holdingDays);
    }, 0);
    const avgHoldingTime = userOrdinals.length > 0 ? totalHoldingTime / userOrdinals.length : 0;

    // Find best and worst performers
    const performers = userOrdinals
      .filter(item => item.purchase_price && item.price_btc)
      .map(item => ({
        ...item,
        profit: item.price_btc - item.purchase_price,
        profitPercentage: ((item.price_btc - item.purchase_price) / item.purchase_price) * 100
      }))
      .sort((a, b) => b.profitPercentage - a.profitPercentage);

    const bestPerformer = performers[0];
    const worstPerformer = performers[performers.length - 1];

    // Calculate portfolio diversity (simplified - based on rarity distribution)
    const rarityCount = userOrdinals.reduce((acc, item) => {
      const rarity = item.Sat_Rarity?.toLowerCase() || 'unknown';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {});
    
    const portfolioDiversity = Object.keys(rarityCount).length / Math.max(userOrdinals.length, 1);

    return {
      totalValue,
      totalInvested,
      totalProfit,
      profitPercentage,
      totalItems: userOrdinals.length,
      listedItems: listedItems.length,
      avgHoldingTime,
      bestPerformer,
      worstPerformer,
      portfolioDiversity: portfolioDiversity * 100
    };
  };

  const stats = calculateEnhancedStats();

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case "common": return "text-gray-400";
      case "uncommon": return "text-green-400";
      case "rare": return "text-blue-400";
      case "epic": return "text-purple-400";
      case "legendary": return "text-orange-400";
      case "mythic": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getRarityIcon = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case "common": return <Sparkles className="w-4 h-4" />;
      case "uncommon": return <Zap className="w-4 h-4" />;
      case "rare": return <Crown className="w-4 h-4" />;
      case "epic": return <Crown className="w-4 h-4" />;
      case "legendary": return <Bitcoin className="w-4 h-4" />;
      case "mythic": return <Bitcoin className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatBTC = (amount) => {
    if (!amount) return '0.000000';
    return amount.toFixed(6);
  };

  if (!connected) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Connect your Bitcoin wallet to view your Ordinals portfolio and track your investments.
          </p>
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 text-lg"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Refresh */}
          <div className="flex justify-between items-center mb-8">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                My Portfolio
              </h1>
              <p className="text-xl text-gray-300">
                Track your Bitcoin Ordinals investments and performance
              </p>
              <div className="mt-4 text-sm text-gray-400 font-mono bg-gray-800/50 rounded-lg px-4 py-2 inline-block">
                {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing || ordinalsLoading}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Loading State */}
          {ordinalsLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-400 mr-3" />
              <span className="text-lg">Loading your portfolio...</span>
            </div>
          )}

          {/* Error State */}
          {ordinalsError && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-6 mb-8 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-300 mb-1">Error Loading Portfolio</h3>
                <p className="text-red-200">{ordinalsError}</p>
              </div>
              <button
                onClick={handleRefresh}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Retry
              </button>
            </div>
          )}

          {/* Portfolio Content */}
          {!ordinalsLoading && !ordinalsError && (
            <>
              {/* Portfolio Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Portfolio Value */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Portfolio Value</h3>
                    <Bitcoin className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-2">
                    {formatBTC(stats.totalValue)} BTC
                  </p>
                  <div className={`flex items-center gap-1 text-sm ${
                    stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stats.totalProfit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {stats.totalProfit >= 0 ? '+' : ''}
                    {formatBTC(stats.totalProfit)} BTC ({stats.profitPercentage.toFixed(2)}%)
                  </div>
                </div>

                {/* Total Invested */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Total Invested</h3>
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatBTC(stats.totalInvested)} BTC
                  </p>
                </div>

                {/* Items Owned */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Items Owned</h3>
                    <Package className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
                    <span className="text-sm text-gray-400">
                      ({stats.listedItems} listed)
                    </span>
                  </div>
                </div>

                {/* Avg Holding Time */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Avg Holding</h3>
                    <History className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.avgHoldingTime.toFixed(1)} days
                  </p>
                </div>
              </div>

              {/* Performance Highlights */}
              {(stats.bestPerformer || stats.worstPerformer) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {stats.bestPerformer && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-green-400 text-sm font-medium">Best Performer</h3>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <p className="text-white font-semibold mb-1 truncate">
                        {stats.bestPerformer.name || `Ordinal #${stats.bestPerformer.inscription_number}`}
                      </p>
                      <p className="text-green-400 text-sm">
                        +{stats.bestPerformer.profitPercentage?.toFixed(2)}% ROI
                      </p>
                    </div>
                  )}
                  
                  {stats.worstPerformer && stats.worstPerformer.profitPercentage < 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-red-400 text-sm font-medium">Worst Performer</h3>
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      </div>
                      <p className="text-white font-semibold mb-1 truncate">
                        {stats.worstPerformer.name || `Ordinal #${stats.worstPerformer.inscription_number}`}
                      </p>
                      <p className="text-red-400 text-sm">
                        {stats.worstPerformer.profitPercentage?.toFixed(2)}% ROI
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Holdings Grid */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Package className="w-6 h-6 text-blue-400" />
                      Your Ordinal Holdings ({userOrdinals.length})
                    </h2>
                    
                    {userOrdinals.length > 0 && (
                      <div className="text-sm text-gray-400">
                        {stats.listedItems} listed • {userOrdinals.length - stats.listedItems} unlisted
                      </div>
                    )}
                  </div>

                  {userOrdinals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-lg mb-4">
                        You don't own any ordinals yet
                      </div>
                      <Link to="/marketplace" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300">
                        Browse Marketplace
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {userOrdinals.map((ordinal) => (
                        <OrdinalCard
                          key={ordinal.inscription_id}
                          ordinal={ordinal}
                          onListClick={handleListClick}
                          onViewClick={setSelectedOrdinalDetail}
                          listingInProgress={listingInProgress}
                          getRarityColor={getRarityColor}
                          getRarityIcon={getRarityIcon}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* List Ordinal Modal */}
      {showListModal && (
        <ListOrdinalModal
          ordinal={selectedOrdinalForListing}
          isOpen={showListModal}
          onClose={() => {
            setShowListModal(false);
            setSelectedOrdinalForListing(null);
          }}
          onListed={handleListed}
        />
      )}

      {/* Ordinal Detail Modal */}
      {selectedOrdinalDetail && (
        <OrdinalDetailModal
          ordinal={selectedOrdinalDetail}
          onClose={() => setSelectedOrdinalDetail(null)}
          onListClick={handleListClick}
          getRarityColor={getRarityColor}
          getRarityIcon={getRarityIcon}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Separate Ordinal Card Component for better performance
const OrdinalCard = ({ ordinal, onListClick, onViewClick, listingInProgress, getRarityColor, getRarityIcon, formatDate }) => (
  <div className="bg-gray-700/50 rounded-xl border border-gray-600 overflow-hidden hover:shadow-xl transition-all duration-300 group">
    <div className="relative">
      <img
        src={ordinal.image_url || `https://ordinals.com/content/${ordinal.inscription_id}`}
        alt={ordinal.name}
        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          e.target.src = `https://via.placeholder.com/300x300/1f2937/ffffff?text=Ordinal`;
        }}
      />
      
      {/* Rarity Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-full">
        {getRarityIcon(ordinal.Sat_Rarity)}
        <span className={`text-xs font-medium ${getRarityColor(ordinal.Sat_Rarity)}`}>
          {ordinal.Sat_Rarity || 'common'}
        </span>
      </div>

      {/* Listed Badge */}
      {ordinal.price_btc && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500/90 rounded-full">
          <DollarSign className="w-3 h-3 text-white" />
          <span className="text-xs font-medium text-white">
            {ordinal.price_btc} BTC
          </span>
        </div>
      )}

      {/* Action Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
        <div className="flex flex-col gap-2 w-full px-4">
          {ordinal.price_btc ? (
            <button className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm">
              Update Listing
            </button>
          ) : (
            <button 
              onClick={() => onListClick(ordinal)}
              disabled={listingInProgress}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <List className="w-3 h-3" />
              {listingInProgress ? 'Listing...' : 'List for Sale'}
            </button>
          )}
          <button 
            onClick={() => onViewClick(ordinal)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3" />
            View Details
          </button>
        </div>
      </div>
    </div>
    
    <div className="p-4">
      <h3 className="font-semibold text-white mb-2 truncate">
        {ordinal.name || `Ordinal #${ordinal.inscription_number || ordinal.inscription_id?.slice(-8)}`}
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className="text-white font-semibold flex items-center gap-1">
            <Bitcoin className="w-3 h-3 text-orange-500" />
            {ordinal.price_btc ? `${ordinal.price_btc} BTC` : 'Not Listed'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Acquired:</span>
          <span className="text-white">{formatDate(ordinal.timestamp)}</span>
        </div>
        {ordinal.purchase_price && (
          <div className="flex justify-between">
            <span className="text-gray-400">Cost Basis:</span>
            <span className="text-white">{ordinal.purchase_price} BTC</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Separate Ordinal Detail Modal Component
const OrdinalDetailModal = ({ ordinal, onClose, onListClick, getRarityColor, getRarityIcon, formatDate }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-bold text-white">
            {ordinal.name || `Ordinal Details`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div>
            <img
              src={ordinal.image_url || `https://ordinals.com/content/${ordinal.inscription_id}`}
              alt={ordinal.name}
              className="w-full h-96 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/400x400/1f2937/ffffff?text=Ordinal+Image`;
              }}
            />
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getRarityIcon(ordinal.Sat_Rarity)}
              <span className={`text-lg font-semibold ${getRarityColor(ordinal.Sat_Rarity)}`}>
                {ordinal.Sat_Rarity || 'common'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">Inscription ID</span>
                </div>
                <p className="text-sm text-gray-300 font-mono break-all">
                  {ordinal.inscription_id}
                </p>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bitcoin className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-white">Status</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {ordinal.price_btc ? `Listed: ${ordinal.price_btc} BTC` : 'Not Listed'}
                </p>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">Created</span>
                </div>
                <p className="text-sm text-gray-300">
                  {formatDate(ordinal.timestamp)}
                </p>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="font-semibold text-white">Rarity</span>
                </div>
                <p className="text-sm text-gray-300 capitalize">
                  {ordinal.Sat_Rarity || 'common'}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            {ordinal.purchase_price && (
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-3">Investment Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Purchase Price:</span>
                    <span className="text-white">{ordinal.purchase_price} BTC</span>
                  </div>
                  {ordinal.price_btc && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Value:</span>
                      <span className="text-white font-semibold">{ordinal.price_btc} BTC</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {!ordinal.price_btc && (
                <button 
                  onClick={() => {
                    onClose();
                    onListClick(ordinal);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  List for Sale
                </button>
              )}
              <button 
                onClick={() => window.open(`https://ordinals.com/inscription/${ordinal.inscription_id}`, '_blank')}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Portfolio;
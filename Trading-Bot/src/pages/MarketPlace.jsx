import React, { useState, useEffect } from "react";
import {
  Filter, Search, Bitcoin, Zap, Crown, Sparkles, Shield, Target, 
  CheckCircle, ExternalLink, Calendar, User, Hash, Clock, SortAsc
} from "lucide-react";
import useOrdinalStore from "../store/useOrdinalStore";

const MarketPlace = () => {
  const [priceLimit, setPriceLimit] = useState(0.1);
  const [ordinalPriceLimits, setOrdinalPriceLimits] = useState({});
  const [selectedOrdinalForLimit, setSelectedOrdinalForLimit] = useState(null);
  const [selectedOrdinalDetail, setSelectedOrdinalDetail] = useState(null);
  const [customLimit, setCustomLimit] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 🆕 New Filters
  const [rarityFilter, setRarityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [listedOnly, setListedOnly] = useState(false);
  const [sortOption, setSortOption] = useState("latest");

  const { ordinals, getAllOrdinals } = useOrdinalStore();

  useEffect(() => {
    getAllOrdinals();
  }, [getAllOrdinals]);

  // 🧮 Filter Logic
  const filteredOrdinals = ordinals
    .filter((ordinal) => {
      const priceMatch = ordinal.price_btc <= priceLimit;
      const searchMatch =
        ordinal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordinal.inscription_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const rarityMatch =
        rarityFilter === "all" ||
        ordinal.Sat_Rarity?.toLowerCase() === rarityFilter;

      const listedMatch = listedOnly ? ordinal.price_btc : true;

      const timeMatch =
        timeFilter === "all"
          ? true
          : (() => {
              const days = timeFilter === "24h" ? 1 : 7;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              return new Date(ordinal.timestamp) >= cutoff;
            })();

      return priceMatch && searchMatch && rarityMatch && listedMatch && timeMatch;
    })
    // 🆕 Sort Logic
    .sort((a, b) => {
      switch (sortOption) {
        case "latest":
          return new Date(b.timestamp) - new Date(a.timestamp);
        case "oldest":
          return new Date(a.timestamp) - new Date(b.timestamp);
        case "priceLow":
          return (a.price_btc || Infinity) - (b.price_btc || Infinity);
        case "priceHigh":
          return (b.price_btc || 0) - (a.price_btc || 0);
        case "rarity":
          const rarityOrder = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];
          return (
            rarityOrder.indexOf(a.Sat_Rarity?.toLowerCase()) -
            rarityOrder.indexOf(b.Sat_Rarity?.toLowerCase())
          );
        default:
          return 0;
      }
    });

  const setPriceLimitForOrdinal = (ordinalId, limit) => {
    setOrdinalPriceLimits((prev) => ({
      ...prev,
      [ordinalId]: parseFloat(limit),
    }));
    setSelectedOrdinalForLimit(null);
    setCustomLimit("");
  };

  const removePriceLimit = (ordinalId) => {
    setOrdinalPriceLimits((prev) => {
      const newLimits = { ...prev };
      delete newLimits[ordinalId];
      return newLimits;
    });
  };

  const setLimitForAll = () => {
    const newLimits = {};
    filteredOrdinals.forEach(
      (ordinal) => (newLimits[ordinal.inscription_id] = priceLimit)
    );
    setOrdinalPriceLimits(newLimits);
  };

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

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString() : "N/A";

  return (
    <div className="min-h-screen pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black text-white py-12">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Bitcoin Ordinals Marketplace
            </h1>
            <p className="text-xl text-gray-300">
              Trade smarter with filters and auto-buy price limits
            </p>
          </div>

          {/* 🆕 Filter Controls */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Global Price Limit */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Max Price: <span className="text-blue-400">{priceLimit} BTC</span>
              </label>
              <input
                type="range"
                min="0.00001"
                max="0.1"
                step="0.00001"
                value={priceLimit}
                onChange={(e) => setPriceLimit(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-medium mb-3">Rarity</label>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythic">Mythic</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium mb-3">Sort By</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priceLow">Price: Low → High</option>
                <option value="priceHigh">Price: High → Low</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>

            {/* Time + Listed */}
            <div>
              <label className="block text-sm font-medium mb-3">Filters</label>
              <div className="flex flex-col gap-2">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={listedOnly}
                    onChange={(e) => setListedOnly(e.target.checked)}
                  />
                  Listed Only
                </label>
              </div>
            </div>
            
          </div>
        </div>
      </section>


      {/* Light Section - Ordinals Grid */}
      <section className="bg-white py-12">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Available Ordinals ({filteredOrdinals.length})
            </h2>
            <div className="text-sm text-gray-600">
              Showing ordinals under {priceLimit} BTC
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>

          {/* Ordinals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {filteredOrdinals.map((ordinal) => (
              <div
                key={ordinal.inscription_id}
                className={`bg-gray-50 rounded-xl border-2 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group ${
                  ordinalPriceLimits[ordinal.inscription_id] ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={
                      ordinal.inscription_id && `https://ordinals.com/content/${ordinal.inscription_id}` ||
                      ordinal.image_url ||
                      (ordinal.inscription_id && `https://ord-mirror.magiceden.dev/content/${ordinal.inscription_id}`)
                    }
                    alt={ordinal.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/300x300/1f2937/ffffff?text=Ordinal`;
                    }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-full">
                    {getRarityIcon(ordinal.Sat_Rarity)}
                    <span className={`text-xs font-medium ${getRarityColor(ordinal.Sat_Rarity)}`}>
                      {ordinal.Sat_Rarity || 'common'}
                    </span>
                  </div>
                  
                  {/* Price Limit Indicator */}
                  {ordinalPriceLimits[ordinal.inscription_id] && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500/90 rounded-full">
                      <Target className="w-3 h-3 text-white" />
                      <span className="text-xs font-medium text-white">
                        Limit: {ordinalPriceLimits[ordinal.inscription_id]} BTC
                      </span>
                    </div>
                  )}

                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                    <div className="flex flex-col gap-2 w-full px-4">
                      <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm">
                        Buy Now
                      </button>
                      <button 
                        onClick={() => setSelectedOrdinalForLimit(ordinal)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm flex items-center justify-center gap-1"
                      >
                        <Target className="w-3 h-3" />
                        Set Limit
                      </button>
                      <button 
                        onClick={() => setSelectedOrdinalDetail(ordinal)}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Details
                      </button>
                      {ordinalPriceLimits[ordinal.inscription_id] && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removePriceLimit(ordinal.inscription_id);
                          }}
                          className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-sm"
                        >
                          Remove Limit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 truncate">
                    {ordinal.name || `Ordinal #${ordinal.inscription_number || ordinal.inscription_id.slice(-8)}`}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Bitcoin className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-gray-900">
                        {ordinal.price_btc ? `${ordinal.price_btc} BTC` : 'Not Listed'}
                      </span>
                    </div>
                    {ordinalPriceLimits[ordinal.inscription_id] && ordinal.price_btc && ordinal.price_btc <= ordinalPriceLimits[ordinal.inscription_id] && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        Limit Met!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredOrdinals.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">
                {searchTerm ? 
                  `No ordinals found matching "${searchTerm}" under ${priceLimit} BTC` : 
                  `No ordinals found under ${priceLimit} BTC`
                }
              </div>
              <button 
                onClick={() => {
                  setPriceLimit(0.1);
                  setSearchTerm('');
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Price Limit Modal */}
      {selectedOrdinalForLimit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Set Price Limit for {selectedOrdinalForLimit.name}
            </h3>
            <p className="text-gray-600 mb-4">
              This ordinal will be purchased automatically when its price drops to your limit.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Price: <span className="text-orange-500">
                    {selectedOrdinalForLimit.price_btc ? `${selectedOrdinalForLimit.price_btc} BTC` : 'Not Listed'}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.00001"
                  min="0.00001"
                  max={priceLimit}
                  value={customLimit}
                  onChange={(e) => setCustomLimit(e.target.value)}
                  placeholder="Enter your price limit in BTC"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be between 0.00001 and {priceLimit} BTC
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (customLimit && parseFloat(customLimit) >= 0.00001 && parseFloat(customLimit) <= priceLimit) {
                      setPriceLimitForOrdinal(selectedOrdinalForLimit.inscription_id, customLimit);
                    }
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex-1"
                >
                  Set Limit
                </button>
                <button
                  onClick={() => {
                    setSelectedOrdinalForLimit(null);
                    setCustomLimit('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ordinal Detail Modal */}
      {selectedOrdinalDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedOrdinalDetail.name || `Ordinal Details`}
                </h3>
                <button
                  onClick={() => setSelectedOrdinalDetail(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Section */}
                <div>
                  <img
                    src={
                      selectedOrdinalDetail.inscription_id && `https://ordinals.com/content/${selectedOrdinalDetail.inscription_id}` ||
                      selectedOrdinalDetail.image_url ||
                      (selectedOrdinalDetail.inscription_id && `https://ord-mirror.magiceden.dev/content/${selectedOrdinalDetail.inscription_id}`)
                    }
                    alt={selectedOrdinalDetail.name}
                    className="w-full h-96 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/400x400/1f2937/ffffff?text=Ordinal+Image`;
                    }}
                  />
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getRarityIcon(selectedOrdinalDetail.Sat_Rarity)}
                    <span className={`text-lg font-semibold ${getRarityColor(selectedOrdinalDetail.Sat_Rarity)}`}>
                      {selectedOrdinalDetail.Sat_Rarity || 'common'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-gray-900">Inscription ID</span>
                      </div>
                      <p className="text-sm text-gray-600 font-mono break-all">
                        {selectedOrdinalDetail.inscription_id}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bitcoin className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-gray-900">Price</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedOrdinalDetail.price_btc ? `${selectedOrdinalDetail.price_btc} BTC` : 'Not Listed'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-gray-900">Owner</span>
                      </div>
                      <p className="text-sm text-gray-600 font-mono break-all">
                        {selectedOrdinalDetail.owner || 'Unknown'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold text-gray-900">Created</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedOrdinalDetail.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Additional Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Content Type:</span>
                        <span className="text-gray-900">{selectedOrdinalDetail.content_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Genesis TX:</span>
                        <span className="text-gray-900 font-mono text-xs">
                          {selectedOrdinalDetail.genesis_tx ? `${selectedOrdinalDetail.genesis_tx.slice(0, 16)}...` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value:</span>
                        <span className="text-gray-900">{selectedOrdinalDetail.value || 'N/A'} sats</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300">
                      Buy Now
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedOrdinalDetail(null);
                        setSelectedOrdinalForLimit(selectedOrdinalDetail);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                    >
                      Set Price Limit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dark Section - How It Works */}
      <section className="bg-gradient-to-br from-gray-900 to-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How Price Limit Trading Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Set individual price limits and let our platform execute trades automatically
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Set Individual Limits</h3>
              <p className="text-gray-400">
                Set custom price limits for each ordinal based on your budget and strategy
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Auto-Execute Trades</h3>
              <p className="text-gray-400">
                Our system automatically purchases ordinals when prices meet your set limits
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Instant</h3>
              <p className="text-gray-400">
                Instant on-chain verification and secure transfer to your wallet
              </p>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid #1f2937;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid #1f2937;
        }
      `}</style>
    </div>
  );
};

export default MarketPlace;
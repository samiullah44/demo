import React, { useState } from 'react';
import { Bitcoin, TrendingUp, TrendingDown, Eye, DollarSign, Package } from 'lucide-react';

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('holdings');

  // Mock data - replace with actual API calls
  const portfolioHoldings = [
    {
      id: 1,
      inscription_id: "30d59db66c7ce4960a37bbd2caedd2d9257c32cd815b1dc28dc91a51be8b1554i0",
      name: "Bitcoin Punk #1234",
      image: "https://via.placeholder.com/300x300/1f2937/ffffff?text=BPunk#1234",
      purchase_price: 0.02,
      current_price: 0.025,
      purchase_date: "2024-01-10",
      profit_loss: 0.005,
      profit_loss_percent: 25
    },
    {
      id: 2,
      inscription_id: "fcefb51fde40988a7d1d09dc3e5dfda9b4754f5eca173a36378500694edaf6bei0",
      name: "Ordinal Owl #567",
      image: "https://via.placeholder.com/300x300/1f2937/ffffff?text=Owl#567",
      purchase_price: 0.015,
      current_price: 0.018,
      purchase_date: "2024-01-12",
      profit_loss: 0.003,
      profit_loss_percent: 20
    }
  ];

  const portfolioStats = {
    total_value: 0.043,
    total_invested: 0.035,
    total_profit: 0.008,
    total_items: 2,
    best_performer: "Bitcoin Punk #1234",
    worst_performer: "Ordinal Owl #567"
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              My Portfolio
            </h1>
            <p className="text-xl text-gray-300">
              Track your Bitcoin Ordinals investments and performance
            </p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-rows-2 md:grid-cols-3 gap-6 mb-8">
            <div className="md:row-span-2 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bitcoin className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{portfolioStats.total_value} BTC</h3>
                <p className="text-gray-400">Portfolio Value</p>
                <div className="mt-4 text-green-400 flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{portfolioStats.total_profit} BTC ({((portfolioStats.total_profit / portfolioStats.total_invested) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Invested</p>
                  <p className="text-xl font-bold text-white">{portfolioStats.total_invested} BTC</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Items Owned</p>
                  <p className="text-xl font-bold text-white">{portfolioStats.total_items}</p>
                </div>
                <Package className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Best Performer</p>
                  <p className="text-sm font-bold text-white truncate">{portfolioStats.best_performer}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Worst Performer</p>
                  <p className="text-sm font-bold text-white truncate">{portfolioStats.worst_performer}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Holdings List */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-400" />
                Your Ordinal Holdings
              </h2>

              {portfolioHoldings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-4">
                    You don't own any ordinals yet
                  </div>
                  <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300">
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolioHoldings.map((item) => (
                    <div key={item.id} className="bg-gray-700/50 rounded-xl border border-gray-600 overflow-hidden hover:shadow-xl transition-all duration-300">
                      <div className="relative">
                        <img
                        //   src={`https://ordinals.com/content/${item.inscription_id}`}
                        src={item.image}
                          alt={item.name}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                            item.profit_loss >= 0 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {item.profit_loss >= 0 ? '+' : ''}{item.profit_loss_percent}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2 truncate">{item.name}</h3>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Cost Basis:</span>
                            <span className="text-white">{item.purchase_price} BTC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Value:</span>
                            <span className="text-white font-semibold">{item.current_price} BTC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">P&L:</span>
                            <span className={item.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {item.profit_loss >= 0 ? '+' : ''}{item.profit_loss} BTC
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Acquired:</span>
                            <span className="text-white">{new Date(item.purchase_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm">
                            Sell
                          </button>
                          <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Portfolio;
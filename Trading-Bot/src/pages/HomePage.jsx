import React from 'react';
import { Shield, Wallet, Calendar, ArrowRight, TrendingUp, Bitcoin } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Trusted Bitcoin Ordinals Marketplace
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              TradePulse is the most secure platform for buying and selling Bitcoin Ordinals with instant settlements.
            </p>
            <Link to="/marketplace" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-12 rounded-lg text-lg transition-all duration-300 transform hover:scale-105">
              Start Trading Ordinals
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Buy & Sell Ordinals</h3>
              <p className="text-gray-400">
                Instantly trade Bitcoin Ordinals with secure on-chain settlements.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-all duration-300">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Non-Custodial Security</h3>
              <p className="text-gray-400">
                Your ordinals stay in your wallet until trade completion. No platform risks.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Bitcoin className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Native Bitcoin Wallet</h3>
              <p className="text-gray-400">
                Built-in Bitcoin wallet optimized for ordinal transactions and management.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-orange-500 transition-all duration-300">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Bulk Listings</h3>
              <p className="text-gray-400">
                List multiple ordinals at once with our batch transaction system.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Foundation Of Bitcoin Ordinal Trading
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join the most trusted platform for Bitcoin Ordinal transactions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                50K+
              </div>
              <p className="text-xl text-gray-300">Ordinal Traders</p>
            </div>
            
            <div className="space-y-4">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
                25K+
              </div>
              <p className="text-xl text-gray-300">Ordinals Listed</p>
            </div>
            
            <div className="space-y-4">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                100+
              </div>
              <p className="text-xl text-gray-300">Countries Supported</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Building The Future Of
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                  Bitcoin Digital Artifacts
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                TradePulse provides the most secure and efficient platform for Bitcoin Ordinal transactions with instant on-chain verification.
              </p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                Explore Ordinals
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Stats repeated */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">50k+</div>
                  <p className="text-gray-400 text-sm">Traders</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">25k+</div>
                  <p className="text-gray-400 text-sm">Ordinals</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">100+</div>
                  <p className="text-gray-400 text-sm">Countries</p>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Ordinal marketplace dashboard */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl p-8 border border-gray-700">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-semibold">ORDI</span>
                    </div>
                    <div className="text-lg font-bold">$42.15</div>
                    <div className="text-green-400 text-sm">+2.5%</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold">BTC</span>
                    </div>
                    <div className="text-lg font-bold">$42,158</div>
                    <div className="text-green-400 text-sm">+1.8%</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bitcoin className="w-6 h-6 text-yellow-500" />
                      <span className="text-sm font-semibold">Rare</span>
                    </div>
                    <div className="text-lg font-bold">2.1 BTC</div>
                    <div className="text-green-400 text-sm">Floor Price</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-semibold">Common</span>
                    </div>
                    <div className="text-lg font-bold">0.015 BTC</div>
                    <div className="text-green-400 text-sm">Avg Price</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="h-32 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-lg flex items-center justify-center">
                    <span className="text-gray-300">Live Ordinal Trading Activity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default HomePage;
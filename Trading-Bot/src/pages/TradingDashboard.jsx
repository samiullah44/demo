import React, { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Zap, Target } from 'lucide-react';

const TradingDashboard = () => {
  const [activeTab, setActiveTab] = useState('active');

  // Mock data - replace with actual API calls
  const activeTriggers = [
    {
      id: 1,
      ordinal_name: "Bitcoin Punk #1234",
      trigger_type: "LIMIT_BUY",
      target_price: 0.02,
      current_price: 0.025,
      direction: "BELOW",
      created_at: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      ordinal_name: "Ordinal Owl #567",
      trigger_type: "LIMIT_SELL",
      target_price: 0.05,
      current_price: 0.045,
      direction: "ABOVE",
      created_at: "2024-01-15T09:15:00Z"
    }
  ];

  const recentTransactions = [
    {
      id: 1,
      ordinal_name: "Digital Artifact #234",
      type: "BUY",
      price: 0.031,
      status: "COMPLETED",
      timestamp: "2024-01-15T10:25:00Z",
      tx_hash: "a1b2c3d4e5f6"
    },
    {
      id: 2,
      ordinal_name: "Genesis Ordinal #001",
      type: "SELL",
      price: 0.089,
      status: "COMPLETED",
      timestamp: "2024-01-15T09:45:00Z",
      tx_hash: "b2c3d4e5f6g7"
    }
  ];

  const tradingStats = {
    total_trades: 24,
    successful_trades: 22,
    total_volume: 1.2,
    profit_loss: 0.15
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500';
      case 'PENDING': return 'text-yellow-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Trading Dashboard
            </h1>
            <p className="text-xl text-gray-300">
              Monitor your active trades and transaction history
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{tradingStats.total_trades}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-green-400">
                    {((tradingStats.successful_trades / tradingStats.total_trades) * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Volume</p>
                  <p className="text-2xl font-bold text-white">{tradingStats.total_volume} BTC</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">P&L</p>
                  <p className="text-2xl font-bold text-green-400">+{tradingStats.profit_loss} BTC</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'active'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Active Triggers ({activeTriggers.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'history'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Transaction History ({recentTransactions.length})
            </button>
          </div>

          {/* Active Triggers */}
          {activeTab === 'active' && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-400" />
                  Active Trading Triggers
                </h2>
                {activeTriggers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No active trading triggers
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTriggers.map((trigger) => (
                      <div key={trigger.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{trigger.ordinal_name}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className={`px-2 py-1 rounded ${
                                trigger.trigger_type === 'LIMIT_BUY' 
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {trigger.trigger_type}
                              </span>
                              <span className="text-gray-300">
                                Target: <strong>{trigger.target_price} BTC</strong>
                              </span>
                              <span className="text-gray-300">
                                Current: <strong>{trigger.current_price} BTC</strong>
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm ${
                              trigger.direction === 'BELOW' ? 'text-blue-400' : 'text-green-400'
                            }`}>
                              {trigger.direction === 'BELOW' ? 'Buy when below' : 'Sell when above'}
                            </div>
                            <button className="mt-2 text-red-400 hover:text-red-300 text-sm">
                              Cancel Trigger
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          {activeTab === 'history' && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                  Recent Transactions
                </h2>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No transaction history
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            {getStatusIcon(transaction.status)}
                            <div>
                              <h3 className="font-semibold text-white">{transaction.ordinal_name}</h3>
                              <p className="text-sm text-gray-400">
                                {new Date(transaction.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${
                              transaction.type === 'BUY' ? 'text-blue-400' : 'text-green-400'
                            }`}>
                              {transaction.type} {transaction.price} BTC
                            </div>
                            <div className={`text-sm flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              TX: {transaction.tx_hash.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TradingDashboard;
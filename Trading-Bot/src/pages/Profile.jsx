import React, { useState } from 'react';
import { User, Wallet, Bell, Settings, Shield, LogOut, Edit, Save, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  // Mock user data - replace with actual user context/API
  const userData = {
    username: "satoshi_nakamoto",
    email: "satoshi@bitcoin.org",
    wallet_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balance_btc: 0.5432,
    auto_trade_enabled: true,
    preferences: {
      max_trade_btc: 0.1,
      min_trade_btc: 0.001,
      daily_limit_btc: 1,
      notify_via: ["email", "push"]
    },
    trading_stats: {
      total_trades: 24,
      successful_trades: 22,
      total_volume_btc: 1.2
    }
  };

  const [formData, setFormData] = useState({
    username: userData.username,
    email: userData.email,
    preferences: { ...userData.preferences }
  });

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
    // API call to update user data
  };

  const toggleAutoTrade = () => {
    // Toggle auto trade logic
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">{userData.username}</h2>
                <p className="text-gray-400 text-sm">{userData.email}</p>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'wallet', label: 'Wallet', icon: Wallet },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'settings', label: 'Settings', icon: Settings }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-6 transition-all duration-200">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                        {userData.username}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                        {userData.email}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Wallet Address</label>
                    <div className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm">
                      {userData.wallet_address}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">BTC Balance</label>
                    <div className="flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                      <span className="text-white font-semibold">
                        {showBalance ? userData.balance_btc : '•••••'} BTC
                      </span>
                      <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-gray-400 hover:text-white"
                      >
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trading Stats */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4">Trading Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <p className="text-gray-400 text-sm">Total Trades</p>
                      <p className="text-2xl font-bold text-white">{userData.trading_stats.total_trades}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <p className="text-gray-400 text-sm">Success Rate</p>
                      <p className="text-2xl font-bold text-green-400">
                        {((userData.trading_stats.successful_trades / userData.trading_stats.total_trades) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <p className="text-gray-400 text-sm">Total Volume</p>
                      <p className="text-2xl font-bold text-white">{userData.trading_stats.total_volume_btc} BTC</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold mb-6">Wallet Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Wallet className="w-8 h-8 text-blue-400" />
                      <h3 className="text-xl font-bold">Bitcoin Wallet</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-sm">Address</p>
                        <p className="text-white font-mono text-sm break-all">{userData.wallet_address}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Balance</p>
                        <p className="text-2xl font-bold text-white">{userData.balance_btc} BTC</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                    <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-all duration-300">
                        Deposit BTC
                      </button>
                      <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition-all duration-300">
                        Withdraw BTC
                      </button>
                      <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-all duration-300">
                        View Transaction History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Notification Methods</h3>
                    <div className="space-y-3">
                      {['email', 'push', 'web'].map((method) => (
                        <label key={method} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={userData.preferences.notify_via.includes(method)}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-white capitalize">{method} Notifications</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Trading Alerts</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Price Limit Triggers</p>
                          <p className="text-gray-400 text-sm">Get notified when your price limits are triggered</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Trade Executions</p>
                          <p className="text-gray-400 text-sm">Notifications for completed buy/sell orders</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add other tabs (Security, Settings) similarly */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
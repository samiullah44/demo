import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Globe, Palette, Database } from 'lucide-react';

const Settings = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-cyan-300">Customize your TradePulse experience</p>
          </motion.div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">Notifications</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Email Notifications</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Push Notifications</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Price Alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Security */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">Security</h3>
              </div>
              <div className="space-y-4">
                <button className="w-full text-left p-3 bg-gray-700/50 rounded-xl text-white hover:bg-gray-700/70 transition-all duration-300">
                  Change Password
                </button>
                <button className="w-full text-left p-3 bg-gray-700/50 rounded-xl text-white hover:bg-gray-700/70 transition-all duration-300">
                  Two-Factor Authentication
                </button>
                <button className="w-full text-left p-3 bg-gray-700/50 rounded-xl text-white hover:bg-gray-700/70 transition-all duration-300">
                  Connected Devices
                </button>
              </div>
            </motion.div>

            {/* Preferences */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Palette className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">Preferences</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">Language</label>
                  <select className="w-full p-3 bg-gray-700/50 border border-cyan-400/20 rounded-xl text-white focus:outline-none focus:border-cyan-400">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">Currency</label>
                  <select className="w-full p-3 bg-gray-700/50 border border-cyan-400/20 rounded-xl text-white focus:outline-none focus:border-cyan-400">
                    <option>USD</option>
                    <option>EUR</option>
                    <option>BTC</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Data */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Database className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">Data</h3>
              </div>
              <div className="space-y-4">
                <button className="w-full text-left p-3 bg-gray-700/50 rounded-xl text-white hover:bg-gray-700/70 transition-all duration-300">
                  Export Data
                </button>
                <button className="w-full text-left p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-300">
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState, useEffect } from "react";
import { Wallet, Download, X, AlertCircle, Zap, Shield, ExternalLink, Sparkles } from "lucide-react";
import useWalletStore from "../store/useWalletStore";

const WalletConnect = ({ onClose }) => {
  const [showModal, setShowModal] = useState(true);
  const [availableWallets, setAvailableWallets] = useState({});

  const { connecting, error, connectWallet, checkWalletAvailability, clearError } = useWalletStore();

  useEffect(() => {
    updateAvailability();
    const interval = setInterval(updateAvailability, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateAvailability = () => setAvailableWallets(checkWalletAvailability());

  const handleConnect = async (walletId) => {
    try { 
      await connectWallet(walletId); 
      handleClose(); // Close modal on successful connection
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleInstallWallet = (url) => window.open(url, "_blank");

  const handleClose = () => {
    setShowModal(false);
    clearError();
    setTimeout(() => onClose?.(), 300);
  };

  const wallets = [
    { 
      id: "unisat", 
      name: "Unisat Wallet", 
      available: availableWallets.unisat, 
      installUrl: "https://unisat.io/download", 
      gradient: "from-blue-500 to-purple-600", 
      icon: Zap, 
      description: "Leading Bitcoin Ordinals Wallet" 
    },
    { 
      id: "leather", 
      name: "Leather Wallet", 
      available: availableWallets.leather, 
      installUrl: "https://leather.io/install-extension", 
      gradient: "from-orange-500 to-red-600", 
      icon: Shield, 
      description: "Bitcoin & Stacks Wallet" 
    },
    //it is not downloading fine 
    { 
      id: "okx", 
      name: "OKX Wallet", 
      available: availableWallets.okx, 
      installUrl: "https://www.okx.com/download", 
      gradient: "from-purple-500 to-pink-600", 
      icon: Sparkles, 
      description: "Multi-Chain Web3 Wallet" 
    },
  ];

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-md bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Wallet</h3>
              <button 
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-3">
              {wallets.map((w) => {
                const Icon = w.icon;
                const isConnecting = connecting;
                
                return !w.available ? (
                  <button 
                    key={w.id} 
                    onClick={() => handleInstallWallet(w.installUrl)} 
                    className="w-full flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-4 rounded-lg transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Install {w.name}</div>
                        <div className="text-xs opacity-70">Click to download wallet</div>
                      </div>
                    </div>
                    <Download className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <button 
                    key={w.id} 
                    onClick={() => handleConnect(w.id)} 
                    disabled={connecting}
                    className={`w-full bg-gradient-to-r ${w.gradient} hover:opacity-90 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed group border-0`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{w.name}</div>
                        <div className="text-xs opacity-80">{w.description}</div>
                      </div>
                    </div>
                    {isConnecting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wallet className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Security Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    Secure Connection
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    Your wallet connection is secure and encrypted. We never access your private keys.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {connecting && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                    Connecting to wallet...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WalletConnect;
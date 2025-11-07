import React, { useState, useEffect } from 'react';
import { Wallet, Download, CheckCircle, X, AlertCircle, Zap, Coins, Shield, Sparkles } from 'lucide-react';
import useWalletStore from '../store/useWalletStore';

const WalletConnect = ({ onClose }) => {
  const [showModal, setShowModal] = useState(true);
  const [availableWallets, setAvailableWallets] = useState({});
  
  const {
    connected,
    connecting,
    address,
    walletType,
    balance,
    error,
    connectWallet,
    disconnectWallet,
    checkWalletAvailability,
    clearError
  } = useWalletStore();

  useEffect(() => {
    // Check which wallets are available when modal opens
    setAvailableWallets(checkWalletAvailability());
    clearError(); // Clear any previous errors when modal opens
  }, []);

  const handleConnect = async (walletType) => {
    try {
      await connectWallet(walletType);
      handleClose();
    } catch (error) {
      console.error('Connection failed:', error);
      // Error is already set in the store, so we don't need to handle it here
    }
  };

  const handleClose = () => {
    setShowModal(false);
    clearError();
    // Small delay to allow fade-out animation before calling onClose
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal) => {
    if (!bal) return '0.00000000';
    return (bal / 100000000).toFixed(8); 
  };

  // Wallet configurations
  const wallets = [
    {
      id: 'unisat',
      name: 'Unisat Wallet',
      available: availableWallets.unisat,
      installUrl: 'https://unisat.io/download',
      gradient: 'from-blue-500 to-purple-600',
      hoverGradient: 'from-blue-600 to-purple-700',
      icon: Zap,
      description: 'Popular Bitcoin Ordinals Wallet'
    },
    {
      id: 'xverse',
      name: 'Xverse Wallet',
      available: availableWallets.xverse,
      installUrl: 'https://www.xverse.app/download',
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-600 to-emerald-700',
      icon: Coins,
      description: 'Bitcoin DeFi & Stacks Wallet'
    },
    {
      id: 'leather',
      name: 'Leather Wallet',
      available: availableWallets.leather,
      installUrl: 'https://leather.io/install-extension',
      gradient: 'from-orange-500 to-red-600',
      hoverGradient: 'from-orange-600 to-red-700',
      icon: Shield,
      description: 'Stacks & Bitcoin Wallet'
    },
    {
      id: 'hiro',
      name: 'Hiro Wallet',
      available: availableWallets.hiro,
      installUrl: 'https://www.hiro.so/wallet',
      gradient: 'from-indigo-500 to-blue-600',
      hoverGradient: 'from-indigo-600 to-blue-700',
      icon: Sparkles,
      description: 'Web3 Wallet for Stacks'
    },
    {
      id: 'magic',
      name: 'Magic Eden',
      available: availableWallets.magic,
      installUrl: 'https://wallet.magiceden.io/',
      gradient: 'from-pink-500 to-rose-600',
      hoverGradient: 'from-pink-600 to-rose-700',
      icon: Wallet,
      description: 'NFT Marketplace Wallet'
    }
  ];

  // If wallet is connected, show connected state (this will be rendered in NavBar)
  if (connected) {
    return (
      <div className="flex items-center gap-4">
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">{formatAddress(address)}</span>
          </div>
          <div className="text-xs text-green-300 mt-1">
            {formatBalance(balance)} BTC • {walletType}
          </div>
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Modal for wallet connection
  return (
    <> 
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-md bg-black/60 p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Wallet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Choose your preferred wallet to connect
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center gap-2 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-3">
                {wallets.map((wallet) => {
                  const WalletIcon = wallet.icon;
                  const isConnecting = connecting && walletType === wallet.id;
                  
                  return wallet.available ? (
                    <button
                      key={wallet.id}
                      onClick={() => handleConnect(wallet.id)}
                      disabled={connecting}
                      className={`w-full bg-gradient-to-r ${wallet.gradient} hover:${wallet.hoverGradient} text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed group border-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-white/20 rounded-lg">
                          <WalletIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{wallet.name}</div>
                          <div className="text-xs opacity-80 font-normal">{wallet.description}</div>
                        </div>
                      </div>
                      {isConnecting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Wallet className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ) : (
                    <a
                      key={wallet.id}
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-between group border-0 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg">
                          <WalletIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Install {wallet.name}</div>
                          <div className="text-xs opacity-70 font-normal">{wallet.description}</div>
                        </div>
                      </div>
                      <Download className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </div>

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

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                By connecting your wallet, you agree to our Terms of Service
              </p>

              {/* Connection Status */}
              {connecting && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                      Connecting to {walletType}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletConnect;
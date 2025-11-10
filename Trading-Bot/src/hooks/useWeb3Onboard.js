// hooks/useWeb3Onboard.js
import { useState, useEffect } from 'react';
import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';

// Configure injected wallets (detects Unisat, Xverse, etc.)
const injected = injectedModule();

const onboard = Onboard({
  wallets: [injected],
  chains: [
    {
      id: '0x1',
      token: 'BTC',
      label: 'Bitcoin Mainnet',
      rpcUrl: ''
    }
  ],
  appMetadata: {
    name: 'Ordinal Marketplace',
    icon: '/logo.png',
    description: 'Trade Bitcoin Ordinals'
  }
});

export const useWeb3Onboard = () => {
  const [wallets, setWallets] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const existingWallets = onboard.state.get().wallets;
    if (existingWallets.length > 0) {
      setWallets(existingWallets);
      setConnected(true);
    }

    const unsubscribe = onboard.state.select('wallets').subscribe(setWallets);
    return () => unsubscribe.unsubscribe();
  }, []);

  const connect = async () => {
    try {
      const walletStates = await onboard.connectWallet();
      if (walletStates.length > 0) {
        setConnected(true);
        return walletStates[0];
      }
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    const [primaryWallet] = wallets;
    if (primaryWallet) {
      await onboard.disconnectWallet({ label: primaryWallet.label });
      setConnected(false);
      setWallets([]);
    }
  };

  const currentWallet = wallets[0];
  const address = currentWallet?.accounts[0]?.address;

  return {
    connect,
    disconnect,
    connected,
    address,
    wallet: currentWallet,
    wallets
  };
};
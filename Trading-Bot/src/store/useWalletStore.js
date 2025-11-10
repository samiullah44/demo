import { create } from "zustand";
import axiosInstance from "../lib/axios";

const VERIFY_MESSAGE = "Verify your wallet ownership to log in to Ordinal Marketplace";

const useWalletStore = create((set, get) => ({
  connected: false,
  connecting: false,
  address: null,
  walletType: null,
  publicKey: null,
  network: "mainnet",
  balance: 0,
  error: null,

  // ------------------------------
  // 🔍 Check wallet availability
  // ------------------------------
  checkWalletAvailability: () => {
    if (typeof window === "undefined") return { unisat: false, leather: false, okx: false };

    const unisatAvailable = typeof window.unisat !== "undefined" && typeof window.unisat.requestAccounts === "function";
    
    // Leather detection
    let leatherAvailable = false;
    if (window.LeatherProvider) {
      leatherAvailable = true;
    } else if (window.btc) {
      leatherAvailable = typeof window.btc.request === 'function' || 
                        typeof window.btc.getAddresses === 'function' ||
                        typeof window.btc.connect === 'function';
    }

    // OKX Wallet detection - check multiple possible APIs
    let okxAvailable = false;
    if (window.okxwallet) {
      // Main OKX wallet object
      okxAvailable = true;
    } else if (window.bitkeep && window.bitkeep.bitcoin) {
      // BitKeep (acquired by OKX)
      okxAvailable = true;
    } else if (window.$onekey && window.$onekey.btc) {
      // OneKey wallet (sometimes detected as OKX)
      okxAvailable = true;
    }

    return { 
      unisat: unisatAvailable, 
      leather: leatherAvailable, 
      okx: okxAvailable 
    };
  },

  // ------------------------------
  // 🔌 Connect wallet
  // ------------------------------
  connectWallet: async (walletType) => {
    set({ connecting: true, error: null });
    try {
      switch (walletType) {
        case "unisat":
          return await get().connectUnisat();
        case "leather":
          return await get().connectLeather();
        case "okx":
          return await get().connectOKX();
        default:
          throw new Error("Unsupported wallet type");
      }
    } catch (error) {
      set({ connecting: false, error: error.message });
      throw error;
    }
  },

  // ------------------------------
  // 🟣 OKX Wallet - FIXED IMPLEMENTATION
  // ------------------------------
  connectOKX: async () => {
    // Check for OKX Wallet availability
    const okx = window.okxwallet || (window.bitkeep && window.bitkeep.bitcoin) || window.$onekey;
    if (!okx) {
      throw new Error("OKX Wallet not installed. Please install OKX Wallet first.");
    }

    try {
      console.log("Attempting to connect to OKX Wallet...");
      console.log("OKX wallet object:", okx);

      let address, publicKey, signature;

      // Method 1: Try Bitcoin-specific API first
      if (okx.bitcoin && okx.bitcoin.request) {
        console.log("Using OKX Bitcoin API...");
        try {
          const accounts = await okx.bitcoin.request({ 
            method: 'requestAccounts' 
          });
          console.log("OKX Bitcoin accounts:", accounts);
          
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          } else {
            throw new Error("Please unlock your OKX Wallet and ensure you have Bitcoin accounts");
          }
        } catch (btcError) {
          console.warn("OKX Bitcoin API failed:", btcError);
          // Try alternative methods
        }
      }

      // Method 2: Try main request method
      if (!address && okx.request) {
        console.log("Using OKX main request API...");
        try {
          // Try different method names that OKX might use
          const methodNames = [
            'btc_requestAccounts',
            'requestAccounts', 
            'eth_requestAccounts', // Sometimes they use ETH method for BTC
            'account'
          ];

          for (const method of methodNames) {
            try {
              console.log(`Trying method: ${method}`);
              const accounts = await okx.request({ 
                method: method 
              });
              console.log(`OKX ${method} result:`, accounts);
              
              if (accounts && Array.isArray(accounts) && accounts.length > 0) {
                address = accounts[0];
                break;
              } else if (accounts && typeof accounts === 'string') {
                address = accounts;
                break;
              }
            } catch (methodError) {
              console.warn(`Method ${method} failed:`, methodError);
              continue;
            }
          }

          if (!address) {
            throw new Error("Could not retrieve accounts from OKX Wallet. Please make sure your wallet is unlocked.");
          }
        } catch (requestError) {
          console.warn("OKX main request API failed:", requestError);
        }
      }

      // Method 3: Try direct properties
      if (!address && okx.accounts && okx.accounts.length > 0) {
        console.log("Using OKX direct accounts property...");
        address = okx.accounts[0];
      }

      // Method 4: Try getAccounts method
      if (!address && okx.getAccounts) {
        console.log("Using OKX getAccounts method...");
        try {
          const accounts = await okx.getAccounts();
          console.log("OKX getAccounts result:", accounts);
          if (accounts && accounts.length > 0) {
            address = accounts[0];
          }
        } catch (getAccountsError) {
          console.warn("OKX getAccounts failed:", getAccountsError);
        }
      }

      // If we still don't have an address, throw error
      if (!address) {
        throw new Error("Could not connect to OKX Wallet. Please make sure:\n1. OKX Wallet is unlocked\n2. You have Bitcoin accounts in your wallet\n3. You approve the connection request");
      }

      console.log("OKX address retrieved:", address);

      // Get public key
      try {
        if (okx.getPublicKey) {
          publicKey = await okx.getPublicKey();
        } else if (okx.bitcoin && okx.bitcoin.request) {
          const pubKeyResult = await okx.bitcoin.request({
            method: 'getPublicKey'
          });
          publicKey = pubKeyResult;
        } else if (okx.request) {
          const pubKeyResult = await okx.request({
            method: 'getPublicKey'
          });
          publicKey = pubKeyResult;
        }
        console.log("OKX public key:", publicKey);
      } catch (pubKeyError) {
        console.warn("Could not get public key from OKX:", pubKeyError);
      }

      // Sign message for verification
      try {
        console.log("Requesting signature from OKX...");
        
        const signMethods = [
          { method: 'signMessage', params: [VERIFY_MESSAGE] },
          { method: 'btc_signMessage', params: [VERIFY_MESSAGE] },
          { method: 'personal_sign', params: [VERIFY_MESSAGE, address] },
          { method: 'eth_sign', params: [address, VERIFY_MESSAGE] }
        ];

        for (const signMethod of signMethods) {
          try {
            if (okx.bitcoin && okx.bitcoin.request) {
              signature = await okx.bitcoin.request(signMethod);
            } else if (okx.request) {
              signature = await okx.request(signMethod);
            } else if (okx[signMethod.method]) {
              signature = await okx[signMethod.method](...signMethod.params);
            }
            
            if (signature) {
              console.log(`OKX signature with ${signMethod.method}:`, signature);
              break;
            }
          } catch (signError) {
            console.warn(`Sign method ${signMethod.method} failed:`, signError);
            continue;
          }
        }
      } catch (signError) {
        console.warn("OKX signing failed:", signError);
        // Continue without signature
      }

      // Fetch balance
      const balanceData = await get().fetchRealBalance(address);

      console.log("OKX balance data:", balanceData);

      // Save to backend
      if (signature) {
        await get().saveWalletToBackend({
          address,
          wallet_type: "okx",
          public_key: publicKey,
          network: "mainnet",
          signature,
          message: VERIFY_MESSAGE,
          balance: balanceData.btcBalance,
        });
      }

      set({
        connected: true,
        connecting: false,
        walletType: "okx",
        address,
        publicKey,
        network: "mainnet",
        balance: balanceData.btcBalance,
      });

      localStorage.setItem("connectedWalletType", "okx");
      localStorage.setItem("connectedWalletAddress", address);
      localStorage.setItem("walletNetwork", "mainnet");

      console.log("Successfully connected to OKX Wallet");
      
      return { 
        address,
        publicKey, 
        balance: balanceData.btcBalance,
      };

    } catch (error) {
      console.error("OKX Wallet connection error:", error);
      
      // Provide user-friendly error messages
      let userFriendlyError = error.message;
      if (error.message.includes("rejected") || error.message.includes("denied") || error.message.includes("User denied")) {
        userFriendlyError = "Connection was rejected. Please approve the connection in your OKX Wallet.";
      } else if (error.message.includes("unlocked") || error.message.includes("lock")) {
        userFriendlyError = "Please unlock your OKX Wallet and try again.";
      } else if (error.message.includes("account") || error.message.includes("No accounts")) {
        userFriendlyError = "No Bitcoin accounts found. Please make sure you have Bitcoin accounts in your OKX Wallet.";
      }
      
      set({ connecting: false, error: userFriendlyError });
      throw new Error(userFriendlyError);
    }
  },

  // ... rest of the methods remain the same (Unisat, Leather, balance fetching, etc.)
  // ------------------------------
  // 💙 Unisat Wallet
  // ------------------------------
  connectUnisat: async () => {
    if (!window.unisat) {
      throw new Error("Unisat Wallet not installed");
    }

    try {
      const accounts = await window.unisat.requestAccounts();
      if (!accounts || accounts.length === 0) throw new Error("No accounts found in Unisat wallet");

      const address = accounts[0];
      const publicKey = await window.unisat.getPublicKey();
      const network = await window.unisat.getNetwork();
      
      // Fetch balance
      const balance = await window.unisat.getBalance();
      
      // Sign message for verification
      const signature = await window.unisat.signMessage(VERIFY_MESSAGE, "bip322-simple");

      // Save to backend
      await get().saveWalletToBackend({
        address,
        wallet_type: "unisat",
        public_key: publicKey,
        network,
        signature,
        message: VERIFY_MESSAGE,
        balance: balance.total || balance.confirmed || 0,
      });

      set({
        connected: true,
        connecting: false,
        walletType: "unisat",
        address,
        publicKey,
        network,
        balance: balance.total || balance.confirmed || 0,
      });

      localStorage.setItem("connectedWalletType", "unisat");
      localStorage.setItem("connectedWalletAddress", address);
      localStorage.setItem("walletNetwork", network);

      return { 
        address, 
        publicKey, 
        network, 
        balance: balance.total || balance.confirmed || 0,
      };
    } catch (error) {
      set({ connecting: false, error: error.message });
      throw error;
    }
  },

  // ------------------------------
  // 🟠 Leather Wallet
  // ------------------------------
  connectLeather: async () => {
    const leather = window.LeatherProvider || window.btc;
    if (!leather) {
      throw new Error("Leather Wallet not installed");
    }

    try {
      console.log("Attempting to connect to Leather wallet...");

      let addressObj, publicKey, signature;

      // Try different API methods to get address
      if (leather.request) {
        console.log("Using request API...");
        try {
          const requestResult = await leather.request('getAddresses');
          console.log("Leather request result:", requestResult);
          
          if (requestResult) {
            if (Array.isArray(requestResult)) {
              addressObj = requestResult[0];
            } else if (requestResult.addresses && Array.isArray(requestResult.addresses)) {
              addressObj = requestResult.addresses[0];
            } else if (requestResult.result && requestResult.result.addresses) {
              addressObj = requestResult.result.addresses[0];
            }
          }
        } catch (requestError) {
          console.warn("Leather request API failed:", requestError);
        }
      }

      if (!addressObj) {
        throw new Error("Could not retrieve address from Leather wallet.");
      }

      console.log("Leather address object retrieved:", addressObj);

      // Extract address string
      let addressString;
      if (typeof addressObj === 'string') {
        addressString = addressObj;
      } else if (addressObj.address) {
        addressString = addressObj.address;
      } else {
        throw new Error("Invalid address format received from Leather wallet");
      }

      console.log("Extracted address string:", addressString);

      // Get public key from address object if available
      if (addressObj.publicKey) {
        publicKey = addressObj.publicKey;
      }

      // Get signature
      try {
        console.log("Requesting signature for verification...");
        const signResult = await leather.request('signMessage', {
          message: VERIFY_MESSAGE,
          network: 'mainnet'
        });
        console.log("Leather sign result:", signResult);

        if (signResult && signResult.result) {
          publicKey = signResult.result.publicKey || publicKey;
          signature = signResult.result.signature;
        }
      } catch (signError) {
        console.warn("Leather signing failed:", signError);
      }

      // Fetch balance
      const balanceData = await get().fetchRealBalance(addressString);

      console.log("Real balance data:", balanceData);

      // Save to backend
      if (signature) {
        await get().saveWalletToBackend({
          address: addressString,
          wallet_type: "leather",
          public_key: publicKey,
          network: "mainnet",
          signature,
          message: VERIFY_MESSAGE,
          balance: balanceData.btcBalance,
        });
      }

      set({
        connected: true,
        connecting: false,
        walletType: "leather",
        address: addressString,
        publicKey,
        network: "mainnet",
        balance: balanceData.btcBalance,
      });

      localStorage.setItem("connectedWalletType", "leather");
      localStorage.setItem("connectedWalletAddress", addressString);
      localStorage.setItem("walletNetwork", "mainnet");

      console.log("Successfully connected to Leather wallet");
      
      return { 
        address: addressString,
        publicKey, 
        balance: balanceData.btcBalance,
      };

    } catch (error) {
      console.error("Leather connection error:", error);
      set({ connecting: false, error: error.message });
      throw error;
    }
  },

  // ------------------------------
  // 💰 REAL BALANCE FETCHING
  // ------------------------------

  // Fetch real BTC balance from blockchain API
  fetchRealBalance: async (address) => {
    try {
      console.log(`Fetching real balance for address: ${address}`);
      
      // Using Blockstream API for Bitcoin mainnet
      const response = await fetch(`https://blockstream.info/api/address/${address}`);
      
      if (!response.ok) {
        throw new Error(`Blockstream API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Blockstream API response:", data);
      
      // Calculate total balance (confirmed + unconfirmed)
      const confirmedBalance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      const unconfirmedBalance = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
      const totalBalance = (confirmedBalance + unconfirmedBalance) / 100000000; // Convert satoshis to BTC
      
      return {
        btcBalance: totalBalance,
        confirmed: confirmedBalance / 100000000,
        unconfirmed: unconfirmedBalance / 100000000
      };
      
    } catch (error) {
      console.error("Error fetching real balance:", error);
      // Fallback to zero instead of fake data
      return { 
        btcBalance: 0,
        confirmed: 0,
        unconfirmed: 0
      };
    }
  },

  // ------------------------------
  // 🧾 Save wallet to backend
  // ------------------------------
  saveWalletToBackend: async (walletData) => {
    try {
      const sanitizedData = {
        ...walletData,
        address: String(walletData.address)
      };
      
      console.log("Sending wallet data to backend:", sanitizedData);
      
      const res = await axiosInstance.post("/users/wallet/connect", sanitizedData);
      if (res.status >= 200 && res.status < 300) {
        console.log("✅ Wallet saved to backend:", res.data);
        return res.data;
      }
      throw new Error(res.data?.error || res.statusText);
    } catch (error) {
      console.error("❌ Error saving wallet:", error);
      throw error;
    }
  },

  // ------------------------------
  // 🔄 Update balance with REAL data
  // ------------------------------
  updateBalance: async () => {
    const { address, walletType } = get();
    if (!address || !walletType) return;

    try {
      console.log("Updating balance with real data...");
      
      if (walletType === 'unisat' && window.unisat) {
        const balance = await window.unisat.getBalance();
        set({
          balance: balance.total || balance.confirmed || 0,
        });
      } else if (walletType === 'leather') {
        const balanceData = await get().fetchRealBalance(address);
        set({
          balance: balanceData.btcBalance,
        });
      } else if (walletType === 'okx') {
        const balanceData = await get().fetchRealBalance(address);
        set({
          balance: balanceData.btcBalance,
        });
      }
      
      console.log("Balance updated successfully");
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  },

  // ------------------------------
  // 🔌 Disconnect wallet
  // ------------------------------
  disconnectWallet: async () => {
    const { address } = get();
    if (address) {
      try {
        await axiosInstance.post("/users/wallet/disconnect", { address });
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
    }
    
    set({
      connected: false,
      connecting: false,
      walletType: null,
      address: null,
      publicKey: null,
      balance: 0,
      error: null
    });
    
    localStorage.removeItem("connectedWalletType");
    localStorage.removeItem("connectedWalletAddress");
    localStorage.removeItem("walletNetwork");
  },

  clearError: () => set({ error: null }),

  // ------------------------------
  // Auto-reconnect
  // ------------------------------
  initializeFromStorage: () => {
    if (typeof window === "undefined") return;
    const walletType = localStorage.getItem("connectedWalletType");
    const address = localStorage.getItem("connectedWalletAddress");
    if (walletType && address) {
      set({ 
        connected: true, 
        walletType, 
        address,
        network: localStorage.getItem("walletNetwork") || "mainnet"
      });
      
      // Update with real data on reconnect
      setTimeout(() => {
        get().updateBalance();
      }, 1000);
    }
  }
}));

// Initialize on store creation
if (typeof window !== "undefined") {
  useWalletStore.getState().initializeFromStorage();
}

export default useWalletStore;
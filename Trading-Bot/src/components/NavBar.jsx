import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  BarChart3,
  Store,
  Home,
  Wallet,
  User,
  Activity,
  Sun,
  Moon,
  Search,
  LogOut,
  Settings,
  UserCircle,
  ChevronDown,
  Loader,
  Sparkles,
  TrendingUp,
  Gem,
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import useWalletStore from "../store/useWalletStore";
import { useAuthStore } from "../store/useAuthStore";
import useOrdinalStore from '../store/useOrdinalStore';

const NavBar = ({ onShowWalletModal }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const themeDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  
  const { getOrdinalById } = useOrdinalStore();
  const { theme, setTheme } = useThemeStore();
  
  // ✅ FIXED: Use individual selectors to prevent re-render loops
  const connected = useWalletStore((state) => state.connected);
  const address = useWalletStore((state) => state.address);
  const walletType = useWalletStore((state) => state.walletType);
  const balance = useWalletStore((state) => state.balance);
  const disconnectWallet = useWalletStore((state) => state.disconnectWallet);
  
  const authUser = useAuthStore((state) => state.authUser);
  const logout = useAuthStore((state) => state.logout);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Collections", href: "/collections", icon: Gem },
  ];

  const themes = [
    { id: "light", name: "Light", icon: Sun, color: "text-amber-500", bg: "bg-amber-500" },
    { id: "dark", name: "Dark", icon: Moon, color: "text-indigo-400", bg: "bg-indigo-600" },
  ];

  const userMenuItems = [
    { name: "Profile", href: "/profile", icon: UserCircle },
    { name: "Portfolio", href: "/portfolio", icon: Wallet },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchExpanded(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setIsThemeDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    setIsThemeDropdownOpen(false);
    document.documentElement.setAttribute("data-theme", selectedTheme);
  };

  const getCurrentThemeIcon = () => {
    const currentTheme = themes.find((t) => t.id === theme);
    return currentTheme ? currentTheme.icon : Moon;
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal) => {
    if (!bal) return '0.00';
    return (bal).toFixed(2);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserDropdownOpen(false);
    navigate('/', { replace: true });
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setIsUserDropdownOpen(false);
  };

  // Check user states - UPDATED to be more reliable
  const isEmailLoggedIn = !!authUser;
  const isWalletOnlyConnected = connected && !authUser;
  const isEmailWithWallet = !!authUser && connected;
  const isLoggedOut = !authUser && !connected;

  const getDisplayInfo = () => {
    if (isWalletOnlyConnected) {
      return {
        type: 'wallet-only',
        displayName: formatAddress(address),
        subtitle: `${formatBalance(balance)} BTC`,
        walletType: walletType
      };
    }
    
    if (isEmailWithWallet) {
      return {
        type: 'email-with-wallet',
        displayName: formatAddress(address),
        subtitle: `${formatBalance(balance)} BTC`,
        walletType: walletType
      };
    }
    
    if (isEmailLoggedIn) {
      return {
        type: 'email-only',
        displayName: authUser.username || authUser.email?.split('@')[0] || 'User',
        subtitle: 'Email Account'
      };
    }
    
    return null;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError("");
    
    try {
      const cleanQuery = searchQuery.trim();
      
      if (!isValidInscriptionId(cleanQuery)) {
        setSearchError("Please enter a valid inscription ID or number");
        setIsSearching(false);
        return;
      }

      const result = await getOrdinalById(cleanQuery);
      
      navigate(`/inscription/${cleanQuery}`, { 
        state: { 
          inscriptionData: result.data,
          source: result.source,
          searchQuery: cleanQuery
        }
      });
      
      setIsSearchExpanded(false);
      setSearchQuery("");
      
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error.message || 'Failed to fetch inscription data');
      setTimeout(() => setSearchError(""), 5000);
    } finally {
      setIsSearching(false);
    }
  };

  const isValidInscriptionId = (id) => {
    return /^[a-f0-9]{64}i\d+$/.test(id) || /^\d+$/.test(id);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const userInfo = getDisplayInfo();
  const CurrentThemeIcon = getCurrentThemeIcon();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200, damping: 15 }
    }
  };

  return (
    <motion.nav
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="navbar fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/20 shadow-2xl shadow-purple-500/10"
    >
      <div className="navbar-container max-w-8xl mx-auto px-3 sm:px-6 w-full">
        {/* Main Navbar Row - Compact Height */}
        <div className="navbar-content flex justify-between items-center h-14 md:h-16 w-full">
          
          {/* Left Section - Logo & Mobile Menu */}
          <motion.div 
            className="navbar-left flex items-center space-x-2 md:space-x-4"
            variants={itemVariants}
          >
            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn btn-ghost btn-square btn-sm text-purple-200"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>

            {/* Logo - Smaller Size */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <Link to="/" className="flex items-center space-x-2">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <div className="relative">
                    <Sparkles className="h-6 w-6 text-amber-400" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border border-amber-400/30 rounded-full"
                    />
                  </div>
                </motion.div>
                <motion.span 
                  className="text-lg font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                >
                  OrdinalHub
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Center Section - Desktop Navigation in Rounded Container */}
          <motion.div 
            className="navbar-center hidden lg:flex"
            variants={itemVariants}
          >
            <motion.div 
              className="flex items-center space-x-1 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/20 px-2 py-1 shadow-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {navigation.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <motion.div
                    key={item.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Link
                      to={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? "text-white bg-gradient-to-r from-purple-600 to-amber-600 shadow-lg shadow-purple-500/25"
                          : "text-purple-200 hover:text-white hover:bg-purple-500/20"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Right Section - Search, Theme, User */}
          <motion.div 
            className="navbar-right flex items-center space-x-2 md:space-x-3 flex-shrink-0"
            variants={itemVariants}
          >
            {/* Smart Expandable Search Bar with Slide */}
            <motion.div 
              ref={searchRef}
              className="relative"
            >
              <AnimatePresence mode="wait">
                {isSearchExpanded ? (
                  <motion.div
                    key="expanded-search"
                    initial={{ opacity: 0, width: 40, x: 20 }}
                    animate={{ opacity: 1, width: 400, x: 0 }}
                    exit={{ opacity: 0, width: 40, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-0 -top-5 z-50 bg-slate-800/95 backdrop-blur-lg border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden"
                    style={{ originX: 1 }}
                  >
                    <div className="flex items-center px-3 py-2">
                      <Search className="h-4 w-4 text-purple-400 mr-2 flex-shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search inscription ID..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-purple-200/50 text-sm"
                        disabled={isSearching}
                        autoFocus
                      />
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={handleSearch}
                          disabled={isSearching || !searchQuery.trim()}
                          className="btn btn-ghost btn-xs btn-square text-purple-400 hover:text-amber-400 transition-colors"
                        >
                          {isSearching ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => setIsSearchExpanded(false)}
                          className="btn btn-ghost btn-xs btn-square text-purple-400 hover:text-amber-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    {searchError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 py-2 bg-red-900/50 border-t border-red-500/30"
                      >
                        <p className="text-red-400 text-xs">{searchError}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="collapsed-search"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSearchExpanded(true)}
                    className="btn btn-ghost btn-square btn-sm text-purple-200 hover:text-amber-400 hover:bg-purple-500/20 transition-all duration-300"
                  >
                    <Search className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Theme Selector - REPLACED DaisyUI with custom dropdown */}
            <motion.div 
              ref={themeDropdownRef}
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.button 
                className="btn btn-ghost btn-square btn-sm text-purple-200 hover:text-amber-400 hover:bg-purple-500/20"
                whileHover={{ rotate: 15 }}
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              >
                <CurrentThemeIcon className="h-4 w-4" />
              </motion.button>
              
              <AnimatePresence>
                {isThemeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-40 bg-slate-800/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-purple-300 px-2 py-1">
                        THEME
                      </div>
                      {themes.map((themeOption) => {
                        const ThemeIcon = themeOption.icon;
                        const isSelected = theme === themeOption.id;
                        
                        return (
                          <motion.button
                            key={themeOption.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleThemeChange(themeOption.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              isSelected 
                                ? 'bg-purple-500/20 text-amber-300' 
                                : 'text-purple-200 hover:text-white hover:bg-purple-500/10'
                            }`}
                          >
                            <ThemeIcon className={`h-4 w-4 ${themeOption.color}`} />
                            <span>{themeOption.name}</span>
                            {isSelected && (
                              <motion.div 
                                className="ml-auto w-2 h-2 rounded-full bg-amber-400"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* User States */}
            
            {/* Case 1: Email only */}
            {isEmailLoggedIn && !connected && (
              <motion.div 
                className="flex items-center space-x-2"
                variants={itemVariants}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onShowWalletModal}
                  className="hidden sm:flex btn btn-sm bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700"
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  Connect
                </motion.button>
                
                <motion.div 
                  ref={userDropdownRef}
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.button 
                    className="btn btn-ghost btn-circle btn-sm text-purple-200 hover:text-amber-400 hover:bg-purple-500/20"
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    <UserCircle className="h-5 w-5" />
                  </motion.button>
                  
                  <AnimatePresence>
                    {isUserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-2">
                          {/* User Info */}
                          <div className="px-3 py-3 border-b border-purple-500/20">
                            <div className="flex items-center space-x-3">
                              <div className="avatar placeholder">
                                <div className="bg-gradient-to-r from-amber-500 to-purple-600 text-white rounded-full w-10">
                                  <span className="text-sm">
                                    {userInfo?.displayName?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-base font-semibold text-white">
                                  {userInfo?.displayName}
                                </p>
                                <p className="text-sm text-purple-300">Email Account</p>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-2">
                            {userMenuItems.map((item) => {
                              const MenuIcon = item.icon;
                              return (
                                <Link
                                  key={item.name}
                                  to={item.href}
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center space-x-3 px-3 py-2.5 text-sm text-purple-200 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                                >
                                  <MenuIcon className="h-5 w-5" />
                                  <span>{item.name}</span>
                                </Link>
                              );
                            })}
                          </div>

                          {/* Logout Button */}
                          <div className="pt-2 border-t border-purple-500/20">
                            <button
                              onClick={handleLogout}
                              className="flex items-center space-x-3 px-3 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            >
                              <LogOut className="h-5 w-5" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* Case 2 & 3: Wallet connected */}
            {(isWalletOnlyConnected || isEmailWithWallet) && (
              <motion.div 
                ref={userDropdownRef}
                className="relative"
                variants={itemVariants}
              >
                <motion.button 
                  className="btn btn-outline btn-sm border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 hover:text-white gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="max-w-[100px] truncate text-sm">{userInfo?.displayName}</span>
                  <ChevronDown className="h-4 w-4" />
                </motion.button>
                
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2">
                        {/* Wallet Info */}
                        <div className="px-3 py-3 border-b border-purple-500/20">
                          <div className="flex items-center space-x-3">
                            <div className="avatar placeholder">
                              <div className="bg-gradient-to-r from-green-500 to-cyan-600 text-white rounded-full w-10">
                                <Wallet className="h-5 w-5" />
                              </div>
                            </div>
                            <div>
                              <p className="text-base font-semibold text-white truncate">
                                {userInfo?.displayName}
                              </p>
                              <p className="text-sm text-cyan-300">{userInfo?.subtitle}</p>
                              <p className="text-sm text-purple-300 capitalize">
                                {userInfo?.walletType} Wallet
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {userMenuItems.map((item) => {
                            const MenuIcon = item.icon;
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-purple-200 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                              >
                                <MenuIcon className="h-5 w-5" />
                                <span>{item.name}</span>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Disconnect Wallet Button */}
                        <div className="pt-2 border-t border-purple-500/20">
                          <button
                            onClick={handleDisconnectWallet}
                            className="flex items-center space-x-3 px-3 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          >
                            <Wallet className="h-5 w-5" />
                            <span>Disconnect Wallet</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* No User - Connect & Login */}
            {!authUser && !connected && (
              <motion.div 
                className="flex items-center space-x-2"
                variants={itemVariants}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onShowWalletModal}
                  className="hidden sm:flex btn btn-sm bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700"
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  Connect
                </motion.button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/login" className="btn btn-outline btn-sm border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 hover:text-white gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-slate-800/95 backdrop-blur-xl border-t border-purple-500/20"
            >
              <div className="py-4 space-y-2">
                {/* Navigation Links */}
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <motion.div
                      key={item.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 mx-2 rounded-xl ${
                          isActive
                            ? "bg-gradient-to-r from-purple-600 to-amber-600 text-white shadow-lg"
                            : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}

                {/* User Section */}
                <div className="border-t border-purple-500/20 pt-4 mt-2">
                  {isEmailLoggedIn && !connected && (
                    <>
                      <div className="px-4 py-2 text-sm font-semibold text-purple-300">
                        EMAIL ACCOUNT
                      </div>
                      <div className="flex items-center space-x-3 px-4 py-3 mx-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <UserCircle className="h-5 w-5 text-purple-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{userInfo?.displayName}</p>
                          <p className="text-xs text-purple-300">Email Account</p>
                        </div>
                      </div>
                    </>
                  )}

                  {(isWalletOnlyConnected || isEmailWithWallet) && (
                    <>
                      <div className="px-4 py-2 text-sm font-semibold text-purple-300">
                        WALLET ACCOUNT
                      </div>
                      <div className="flex items-center space-x-3 px-4 py-3 mx-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                        <Wallet className="h-5 w-5 text-cyan-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{userInfo?.displayName}</p>
                          <p className="text-xs text-cyan-300">{userInfo?.subtitle}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* User Menu Items */}
                  <div className="space-y-1 mt-2">
                    {userMenuItems.map((item) => {
                      const MenuIcon = item.icon;
                      return (
                        <motion.div
                          key={item.name}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Link
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-3 mx-2 text-purple-200 hover:bg-purple-500/20 hover:text-white rounded-xl"
                          >
                            <MenuIcon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-purple-500/20 pt-2 mt-2 space-y-2">
                    {isEmailLoggedIn && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          onShowWalletModal();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-2 w-[calc(100%-1rem)] mx-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium shadow-lg"
                      >
                        <Wallet className="h-4 w-4" />
                        <span>Connect Wallet</span>
                      </motion.button>
                    )}
                    
                    {isEmailLoggedIn && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 mx-2 w-[calc(100%-1rem)] text-red-400 hover:bg-red-500/10 rounded-xl"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </motion.button>
                    )}
                    {(isWalletOnlyConnected || isEmailWithWallet) && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDisconnectWallet}
                        className="flex items-center space-x-3 px-4 py-3 mx-2 w-[calc(100%-1rem)] text-red-400 hover:bg-red-500/10 rounded-xl"
                      >
                        <Wallet className="h-5 w-5" />
                        <span>Disconnect Wallet</span>
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Connect & Login for No User */}
                {!authUser && !connected && (
                  <div className="border-t border-purple-500/20 pt-4 mt-2 space-y-2 px-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onShowWalletModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium shadow-lg"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Connect Wallet</span>
                    </motion.button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-xl font-medium hover:bg-purple-500/30 hover:text-white"
                      >
                        <User className="h-4 w-4" />
                        <span>Login</span>
                      </Link>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default NavBar;
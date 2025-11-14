import React, { useState } from "react";
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
  Palette,
  Sun,
  Moon,
  Coffee,
  Zap,
  Search,
  LogOut,
  Settings,
  UserCircle,
  ChevronDown,
  Loader,
  Mail,
} from "lucide-react";
import WalletConnect from "../components/WalletConnect";
import { useThemeStore } from "../store/useThemeStore";
import useWalletStore from "../store/useWalletStore";
import { useAuthStore } from "../store/useAuthStore";
import { getInscriptionDataById } from "../lib/ordinalsService";

const NavBar = ({ onShowWalletModal }) => {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const { theme, setTheme } = useThemeStore();
  const { connected, address, walletType, balance, disconnectWallet } = useWalletStore();
  const { authUser, logout } = useAuthStore();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Markets", href: "/marketplace", icon: Store },
    { name: "Collections", href: "/collections", icon: Store },
  ];

  const themes = [
    { id: "light", name: "Light", icon: Sun, color: "text-yellow-500" },
    { id: "dark", name: "Dark", icon: Moon, color: "text-blue-400" },
    { id: "cupcake", name: "Cupcake", icon: Coffee, color: "text-pink-400" },
    { id: "cyberpunk", name: "Cyberpunk", icon: Zap, color: "text-cyan-400" },
    { id: "synthwave", name: "Synthwave", icon: Activity, color: "text-purple-400" },
    { id: "retro", name: "Retro", icon: Palette, color: "text-orange-400" },
    { id: "valentine", name: "Valentine", icon: User, color: "text-red-400" },
    { id: "aqua", name: "Aqua", icon: Activity, color: "text-teal-400" },
  ];

  const userMenuItems = [
    { name: "Profile", href: "/profile", icon: UserCircle },
    { name: "Wallet Details", href: "/wallet", icon: Wallet },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Add Address", href: "/add-address", icon: User },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  };

  const logoVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: {
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.2 },
    },
    hover: { scale: 1.1, rotate: 5, transition: { duration: 0.3 } },
  };

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    setIsThemeDropdownOpen(false);
    document.documentElement.setAttribute("data-theme", selectedTheme);
  };

  const getCurrentThemeIcon = () => {
    const currentTheme = themes.find((t) => t.id === theme);
    return currentTheme ? currentTheme.icon : Palette;
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal) => {
    if (!bal) return '0.00000000';
    return (bal).toFixed(8);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserDropdownOpen(false);
    navigate('/');
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setIsUserDropdownOpen(false);
  };

  // Check user states
  const isEmailLoggedIn = !!authUser && !authUser.isWalletUser;
  const isWalletOnlyConnected = connected && !authUser;
  const isEmailWithWallet = !!authUser && connected;

  // Determine what to display based on the three cases
  const getDisplayInfo = () => {
    // Case 2: Wallet only (no email login)
    if (isWalletOnlyConnected) {
      return {
        type: 'wallet-only',
        displayName: formatAddress(address),
        subtitle: `${formatBalance(balance)} BTC`,
        walletType: walletType
      };
    }
    
    // Case 3: Email login with wallet connected
    if (isEmailWithWallet) {
      return {
        type: 'email-with-wallet',
        displayName: formatAddress(address),
        subtitle: `${formatBalance(balance)} BTC`,
        walletType: walletType
      };
    }
    
    // Case 1: Email login only (no wallet)
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
    if (e) {
      e.preventDefault();
    }
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError("");
    
    try {
      const cleanQuery = searchQuery.trim();
      
      // Validate input format
      if (!isValidInscriptionId(cleanQuery)) {
        setSearchError("Please enter a valid inscription ID or number");
        setIsSearching(false);
        return;
      }

      // Fetch inscription data using JSON API
      const inscriptionData = await getInscriptionDataById(cleanQuery);
      
      // Navigate to inscription detail page with the rich data
      navigate(`/inscription/${cleanQuery}`, { 
        state: { 
          inscriptionData,
          searchQuery: cleanQuery
        }
      });
      
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error.message || 'Failed to fetch inscription data');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setSearchError(""), 5000);
    } finally {
      setIsSearching(false);
      setSearchQuery("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };
  const isValidInscriptionId = (id) => {
    // Accepts: numbers (inscription numbers) or full inscription IDs with 'i0' suffix
    return /^\d+$/.test(id) || /^[a-f0-9]{64}i0$/.test(id);
  };

  const userInfo = getDisplayInfo();
  const CurrentThemeIcon = getCurrentThemeIcon();

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 w-full z-50 border-b border-indigo-500/20 bg-gradient-to-br from-gray-900 to-black"
      style={{
        boxShadow: "0 0 25px rgba(0, 255, 255, 0.1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="lg:max-w-8xl mx-auto px-8 w-full">
        {/* Logo Row */}
        <div className="flex justify-between items-center h-20 relative w-full">
          <motion.div
            variants={itemVariants}
            className="shrink-0 flex items-center space-x-3"
          >
            <motion.div
              variants={logoVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              className="relative"
            >
              <div className="relative">
                <Activity className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-cyan-400/20 rounded-full"
                />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 bg-cyan-400/20 blur-sm rounded-full"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0.5, y: 20, scale: 1.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col"
            >
              <Link
                to="/"
                className="text-2xl font-semibold text-white tracking-wider leading-none hover:text-white"
              >
                TradePulse
              </Link>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "70px" }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-px bg-gradient-to-r from-cyan-400 to-transparent mt-1"
              />
            </motion.div>
          </motion.div>

          {/* RIGHT SECTION */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <motion.div
                    key={item.name}
                    variants={itemVariants}
                    onHoverStart={() => setActiveHover(item.name)}
                    onHoverEnd={() => setActiveHover(null)}
                    className="relative"
                  >
                    <Link
                      to={item.href}
                      className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-full text-md font-medium transition-all duration-500 ${
                        isActive
                          ? "text-white"
                          : "text-white hover:text-cyan-300 hover:bg-cyan-400/10"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeHighlight"
                          className="absolute inset-0 bg-cyan-400/10 border border-cyan-400/30 rounded-full shadow-[0_0_20px_#22d3ee]"
                          transition={{
                            type: "spring",
                            stiffness: 250,
                            damping: 20,
                          }}
                        />
                      )}
                      <item.icon className="h-3.5 w-3.5 relative z-10" />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* 🔍 Search Bar */}
           <div className="hidden md:flex items-center ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search by inscription ID (e.g., 12345 or hash)"
                  className="pl-9 pr-10 py-2 w-80 bg-gray-800/70 text-white text-sm rounded-full border border-cyan-400/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-400 transition-all duration-300"
                  disabled={isSearching}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isSearching ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 text-red-400 text-xs bg-red-900/50 px-3 py-1 rounded-lg"
                >
                  {searchError}
                </motion.div>
              )}
            </div>

            {/* Theme Selector */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <button
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full text-white hover:bg-cyan-400/10 hover:text-cyan-300 transition-all duration-300"
              >
                <CurrentThemeIcon className="h-5 w-5" />
                <span className="hidden sm:block">Theme</span>
              </button>

              {/* Theme Dropdown */}
              <AnimatePresence>
                {isThemeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl border border-cyan-400/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-cyan-400 px-3 py-2 border-b border-cyan-400/10">
                        SELECT THEME
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {themes.map((themeOption) => {
                          const ThemeIcon = themeOption.icon;
                          const isSelected = theme === themeOption.id;

                          return (
                            <button
                              key={themeOption.id}
                              onClick={() => handleThemeChange(themeOption.id)}
                              className={`w-full flex items-center space-x-3 px-3 py-3.5 rounded-lg text-sm transition-all duration-200 ${
                                isSelected
                                  ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                                  : "text-white/70 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <ThemeIcon
                                className={`h-4 w-4 ${themeOption.color}`}
                              />
                              <span>{themeOption.name}</span>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto w-2 h-2 bg-cyan-400 rounded-full"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* CASE 1: Email login only - Show Connect Wallet + User Icon */}
            {isEmailLoggedIn && !connected && (
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Connect Wallet Button */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button
                    onClick={onShowWalletModal}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-medium shadow-[0_0_25px_#22d3ee]/60 transition-all duration-500 flex items-center gap-2 text-sm"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </button>
                </motion.div>

                {/* User Icon Dropdown */}
                <motion.div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-all duration-300"
                  >
                    <UserCircle className="h-5 w-5 text-purple-400" />
                    <ChevronDown className={`h-4 w-4 text-purple-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown Menu for Email Only */}
                  <AnimatePresence>
                    {isUserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-cyan-400/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-2">
                          {/* User Info Header */}
                          <div className="px-3 py-3 border-b border-cyan-400/10">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <UserCircle className="h-6 w-6 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {userInfo?.displayName}
                                </p>
                                <p className="text-xs text-cyan-300">
                                  Email Account
                                </p>
                                {authUser?.email && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {authUser.email}
                                  </p>
                                )}
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
                                  className="flex items-center space-x-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                                >
                                  <MenuIcon className="h-4 w-4" />
                                  <span>{item.name}</span>
                                </Link>
                              );
                            })}
                          </div>

                          {/* Logout Button Only */}
                          <div className="pt-2 border-t border-cyan-400/10">
                            <button
                              onClick={handleLogout}
                              className="flex items-center space-x-3 px-3 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            >
                              <LogOut className="h-4 w-4" />
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

            {/* CASE 2 & 3: Wallet connected (with or without email) - Show Wallet Details */}
            {(isWalletOnlyConnected || isEmailWithWallet) && (
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 transition-all duration-300"
                >
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-cyan-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">
                        {userInfo?.displayName}
                      </div>
                      <div className="text-xs text-cyan-300">
                        {userInfo?.subtitle}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-cyan-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Wallet Dropdown Menu */}
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-cyan-400/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2">
                        {/* Wallet Info Header */}
                        <div className="px-3 py-3 border-b border-cyan-400/10">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                              <Wallet className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {userInfo?.displayName}
                              </p>
                              <p className="text-xs text-cyan-300">
                                {userInfo?.subtitle}
                              </p>
                              <p className="text-xs text-gray-400 capitalize">
                                {userInfo?.walletType} Wallet
                              </p>
                              {/* Show email if user is also logged in with email */}
                              {isEmailWithWallet && authUser?.email && (
                                <p className="text-xs text-purple-300 truncate mt-1">
                                  {authUser.email}
                                </p>
                              )}
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
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                              >
                                <MenuIcon className="h-4 w-4" />
                                <span>{item.name}</span>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Disconnect Wallet Button Only - No Logout */}
                        <div className="pt-2 border-t border-cyan-400/10">
                          <button
                            onClick={handleDisconnectWallet}
                            className="flex items-center space-x-3 px-3 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          >
                            <Wallet className="h-4 w-4" />
                            <span>Disconnect Wallet</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* No User Logged In - Show Connect Wallet & Login */}
            {!authUser && !connected && (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button
                    onClick={onShowWalletModal}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full font-medium shadow-[0_0_25px_#22d3ee]/60 transition-all duration-500 flex items-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/login">
                    <div className="bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 text-white px-5 py-2 rounded-full font-medium transition-all duration-300 hover:shadow-[0_0_15px_#22d3ee]/50">
                      <span className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Login</span>
                      </span>
                    </div>
                  </Link>
                </motion.div>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white/70 hover:text-white transition p-2 rounded-xl bg-white/5 hover:bg-white/10"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* 🔍 Mobile Search Bar (Always Visible Below Nav) */}
       <div className="md:hidden px-2 mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search by inscription ID"
              className="pl-9 pr-10 py-2 w-full bg-gray-800/70 text-white text-sm rounded-full border border-cyan-400/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-400"
              disabled={isSearching}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>
          {searchError && (
            <div className="text-red-400 text-xs mt-1 text-center">
              {searchError}
            </div>
          )}
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-cyan-950/30 backdrop-blur-xl border border-cyan-400/10 rounded-2xl mt-2"
            >
              <div className="px-4 py-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${
                        isActive
                          ? "bg-cyan-400/10 text-white border border-cyan-400/30"
                          : "text-white/70 hover:text-cyan-300 hover:bg-cyan-400/5"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Mobile User Section */}
                {isEmailLoggedIn && !connected && (
                  <div className="border-t border-cyan-400/10 pt-4 mt-2">
                    <div className="text-xs font-semibold text-cyan-400 px-4 pb-2">
                      ACCOUNT (EMAIL)
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-4 py-3 bg-purple-400/10 rounded-xl border border-purple-400/20">
                        <UserCircle className="h-5 w-5 text-purple-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{userInfo?.displayName}</p>
                          <p className="text-xs text-cyan-300">Email Account</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          onShowWalletModal();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 px-4 py-3 w-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                      >
                        <Wallet className="h-5 w-5" />
                        <span>Connect Wallet</span>
                      </button>
                      
                      {userMenuItems.map((item) => {
                        const MenuIcon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-3 text-white/70 hover:text-cyan-300 hover:bg-cyan-400/5 rounded-xl transition-all duration-200"
                          >
                            <MenuIcon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Wallet Section */}
                {(isWalletOnlyConnected || isEmailWithWallet) && (
                  <div className="border-t border-cyan-400/10 pt-4 mt-2">
                    <div className="text-xs font-semibold text-cyan-400 px-4 pb-2">
                      ACCOUNT (WALLET)
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-4 py-3 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
                        <Wallet className="h-5 w-5 text-cyan-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{userInfo?.displayName}</p>
                          <p className="text-xs text-cyan-300">{userInfo?.subtitle}</p>
                        </div>
                      </div>
                      
                      {userMenuItems.map((item) => {
                        const MenuIcon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-3 text-white/70 hover:text-cyan-300 hover:bg-cyan-400/5 rounded-xl transition-all duration-200"
                          >
                            <MenuIcon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                      
                      <button
                        onClick={handleDisconnectWallet}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                      >
                        <Wallet className="h-5 w-5" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Theme Selector in Mobile */}
                <div className="border-t border-cyan-400/10 pt-4 mt-2">
                  <div className="text-xs font-semibold text-cyan-400 px-4 pb-2">
                    THEMES
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map((themeOption) => {
                      const ThemeIcon = themeOption.icon;
                      const isSelected = theme === themeOption.id;

                      return (
                        <button
                          key={themeOption.id}
                          onClick={() => {
                            handleThemeChange(themeOption.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            isSelected
                              ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <ThemeIcon className={`h-4 w-4 ${themeOption.color}`} />
                          <span>{themeOption.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Connect Wallet & Login in Mobile (When Not Logged In) */}
                {!authUser && !connected && (
                  <div className="pt-3 border-t border-cyan-400/10 space-y-2">
                    <button
                      onClick={() => {
                        onShowWalletModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Connect Wallet</span>
                    </button>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-cyan-500/20 border border-cyan-400/30 rounded-xl text-white font-medium hover:bg-cyan-500/30 transition-all duration-300"
                    >
                      <User className="h-4 w-4" />
                      <span>Login</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop for dropdowns */}
      <AnimatePresence>
        {(isThemeDropdownOpen || isUserDropdownOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsThemeDropdownOpen(false);
              setIsUserDropdownOpen(false);
            }}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default NavBar;
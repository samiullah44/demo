import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import WalletConnect from "../components/WalletConnect";
import { useThemeStore } from "../store/useThemeStore";

const NavBar = ({ onShowWalletModal }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
   const [showWalletModal, setShowWalletModal] = useState(false);
  const location = useLocation();

  const { theme, setTheme } = useThemeStore();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Markets", href: "/marketplace", icon: Store },
    { name: "Collections", href: "/collection", icon: Store },
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
            {/* Desktop Navigation   */}
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
                  placeholder="Search ordinals by collection name or id"
                  className="pl-9 pr-3 py-2 w-80 bg-gray-800/70 text-white text-sm rounded-full border border-cyan-400/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-400"
                />
              </div>
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

            {/* Connect Wallet */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <button
                onClick={onShowWalletModal} // Changed from setShowWalletModal(true)
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full font-medium shadow-[0_0_25px_#22d3ee]/60 transition-all duration-500 flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </button>
            </motion.div>

            {/* Login Button */}
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
              placeholder="Search ordinals by collection name or id"
              className="pl-9 pr-3 py-2 w-full bg-gray-800/70 text-white text-sm rounded-full border border-cyan-400/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-400"
            />
          </div>
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

                {/* Login button in Mobile */}
                <div className="pt-3 border-t border-cyan-400/10">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-cyan-500/20 border border-cyan-400/30 rounded-xl text-white font-medium hover:bg-cyan-500/30 transition-all duration-300"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop for dropdown */}
      <AnimatePresence>
        {isThemeDropdownOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsThemeDropdownOpen(false)}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default NavBar;

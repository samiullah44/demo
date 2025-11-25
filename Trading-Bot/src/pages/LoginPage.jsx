import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  Wallet,
  X,
  Shield,
  Key,
  Zap,
  Gem,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import useWalletStore from "../store/useWalletStore";
import WalletConnect from "../components/WalletConnect";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("login");
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    authUser,
    isLogingIng,
    isSigningUp,
    auth,
    verifyOtp,
    setUserFromWallet,
  } = useAuthStore();

  const { connected, address, walletType } = useWalletStore();
  const from = location.state?.from?.pathname || "/";

  // Redirect if logged in
  useEffect(() => {
    if (authUser) navigate(from, { replace: true });
  }, [authUser, navigate, from]);

  // Wallet auto-login
  useEffect(() => {
    if (connected && address && walletType && !authUser) {
      setUserFromWallet({ address, walletType });
    }
  }, [connected, address, walletType, authUser, setUserFromWallet]);

  // OTP countdown
  useEffect(() => {
    let t;
    if (otpTimer > 0) {
      t = setInterval(() => setOtpTimer((x) => x - 1), 1000);
    }
    return () => clearInterval(t);
  }, [otpTimer]);

  const formatTime = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
      sec % 60
    ).padStart(2, "0")}`;

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Attempting login for:", email);
      const result = await auth({ email, password });
      console.log("Login result:", result);
      
      if (result.otp_sent) {
        setStep("verify");
        setOtpTimer(180);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Verifying OTP:", otp);
      await verifyOtp({ email, password, code: otp });
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(err.message);
    }
  };

  const handleResendOtp = async () => {
    try {
      await auth({ email, password });
      setOtpTimer(180);
      setError("");
    } catch (err) {
      setError("Failed to resend OTP");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 30, damping: 15 }
    }
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      transition: { duration: 0.2 }
    })
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 pt-16">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10"
      >
        {/* LEFT SIDE - EMAIL LOGIN */}
        <motion.div
          variants={itemVariants}
          className="bg-slate-800/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl shadow-2xl p-8 lg:p-10"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <Mail className="h-8 w-8 text-amber-400" />
                </motion.div>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
                {step === "verify" ? "Verify Identity" : "Email Login"}
              </h1>
            </div>
            <p className="text-purple-200/80 text-lg">
              {step === "verify"
                ? "Enter the 6-digit code sent to your email"
                : "Secure access with email & password"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait" custom={step === "verify" ? 1 : -1}>
            {step === "login" ? (
              <motion.form
                key="login"
                custom={-1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleEmailLogin}
                className="space-y-6"
              >
                {/* Email Input */}
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold mb-3 text-amber-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 h-5 w-5 text-purple-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input w-full pl-12 bg-slate-700/50 border-purple-500/30 text-white placeholder-purple-200/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 rounded-xl"
                      placeholder="your@email.com"
                    />
                  </div>
                </motion.div>

                {/* Password Input */}
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold mb-3 text-amber-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 h-5 w-5 text-purple-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input w-full pl-12 pr-12 bg-slate-700/50 border-purple-500/30 text-white placeholder-purple-200/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 rounded-xl"
                      placeholder="Enter your password"
                    />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-purple-400 hover:text-amber-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="alert bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl"
                  >
                    <div className="flex items-center space-x-2">
                      <X className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  variants={itemVariants}
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn w-full bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700 rounded-xl py-3 text-lg font-semibold transition-all duration-300"
                  disabled={isLogingIng}
                >
                  {isLogingIng ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <Key className="h-5 w-5" />
                      <span>Continue with Email</span>
                    </span>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="verify"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                {/* OTP Input */}
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold mb-3 text-amber-300">
                    Verification Code
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-3 h-5 w-5 text-purple-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input w-full pl-12 text-center text-2xl tracking-widest font-mono bg-slate-700/50 border-purple-500/30 text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 rounded-xl"
                      placeholder="000000"
                    />
                  </div>
                </motion.div>

                {/* Timer */}
                <motion.div variants={itemVariants} className="text-center">
                  {otpTimer > 0 ? (
                    <motion.p 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="flex justify-center items-center gap-2 text-amber-300 font-medium"
                    >
                      <Clock className="h-4 w-4" />
                      Code expires in {formatTime(otpTimer)}
                    </motion.p>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                      onClick={handleResendOtp}
                    >
                      Resend Verification Code
                    </motion.button>
                  )}
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="alert bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl"
                  >
                    <div className="flex items-center space-x-2">
                      <X className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}

                {/* Verify Button */}
                <motion.button
                  variants={itemVariants}
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={otpTimer === 0 || otp.length !== 6}
                  className="btn w-full bg-gradient-to-r from-green-500 to-emerald-600 border-0 text-white shadow-lg shadow-green-500/25 hover:from-green-600 hover:to-emerald-700 rounded-xl py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isSigningUp ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-5 w-5" />
                      <span>Verify & Continue</span>
                    </span>
                  )}
                </motion.button>

                {/* Back Button */}
                <motion.button
                  variants={itemVariants}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep("login")}
                  className="btn btn-ghost w-full text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-xl py-3 transition-all duration-300"
                >
                  ← Back to Login
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT SIDE - WALLET LOGIN */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/80 backdrop-blur-xl border border-cyan-500/20 rounded-3xl shadow-2xl p-8 lg:p-10 flex flex-col justify-center text-center relative overflow-hidden"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="relative z-10">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <motion.div whileHover={{ scale: 1.1, rotate: 10 }} className="relative">
                <Wallet className="h-10 w-10 text-cyan-400" />
              </motion.div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Wallet Login
              </h2>
            </div>
            <p className="text-cyan-200/80 text-lg mb-2">
              Instant access with your wallet
            </p>
            <p className="text-sm mb-8 text-cyan-300/60">
              No passwords, no emails - just connect and go
            </p>
          </motion.div>

          {/* Connect Wallet Button */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setWalletModalOpen(true)}
            className="btn bg-gradient-to-r from-cyan-500 to-blue-600 border-0 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-blue-700 rounded-xl py-4 text-lg font-semibold relative z-10 transition-all duration-300 mb-8"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </motion.button>

          {/* Benefits */}
          <motion.div variants={itemVariants} className="space-y-4 text-left">
            {[
              { icon: Zap, text: "Lightning-fast access", color: "text-yellow-400" },
              { icon: Shield, text: "Enhanced security", color: "text-green-400" },
              { icon: TrendingUp, text: "Direct marketplace integration", color: "text-cyan-400" },
              { icon: Gem, text: "Exclusive wallet holder features", color: "text-purple-400" }
            ].map((item, index) => (
              <motion.div
                key={item.text}
                variants={itemVariants}
                custom={index}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30"
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-cyan-100 text-sm">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* FIXED Wallet Modal */}
      <AnimatePresence>
        {walletModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop - FIXED: Now closes modal when clicked */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setWalletModalOpen(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-cyan-500/20 z-50"
            >
              {/* Close Button */}
              <button
                onClick={() => setWalletModalOpen(false)}
                className="absolute top-4 right-4 text-cyan-300 hover:text-white z-10"
              >
                <X className="h-6 w-6" />
              </button>
              <WalletConnect 
                showAsLogin={true} 
                onClose={() => setWalletModalOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
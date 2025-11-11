import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, CheckCircle, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import useWalletStore from "../store/useWalletStore";
import WalletConnect from "../components/WalletConnect";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("login"); // login → verify
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState("");

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

  // --- Redirect Logic ---
  useEffect(() => {
    if (authUser) {
      console.log("User authenticated, redirecting to:", from);
      navigate(from, { replace: true });
    }
  }, [authUser, navigate, from]);

  // Handle wallet connection when on login page
  useEffect(() => {
    if (connected && address && walletType && !authUser) {
      console.log("Wallet connected, setting user from wallet");
      setUserFromWallet({
        address,
        walletType,
      });
    }
  }, [connected, address, walletType, authUser, setUserFromWallet]);

  // --- OTP Timer ---
  useEffect(() => {
    let timer;
    if (otpTimer > 0) {
      timer = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // --- Handlers ---
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const result = await auth({ email, password });

      if (result.otp_sent) {
        // Needs verification
        setStep("verify");
        setOtpTimer(180);
      } else {
        // Logged in successfully - state is already set in the auth function
        console.log("Email login successful, redirecting to:", from);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await verifyOtp({ email, password, code: otp });
      console.log("OTP verification successful, redirecting to:", from);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendOtp = async () => {
    try {
      await auth({ email, password }); // re-trigger send
      setOtpTimer(180);
    } catch (err) {
      setError("Failed to resend OTP. Try again.");
    }
  };

  // --- Motion Variants ---
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4 pt-20">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* -------------------- LEFT SIDE (Email Login) -------------------- */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="bg-gray-800/60 backdrop-blur-md border border-cyan-400/20 rounded-2xl p-8 shadow-lg"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === "verify" ? "Verify Your Email" : "Welcome Back"}
          </h1>
          <p className="text-cyan-300 mb-8">
            {step === "verify"
              ? "Enter the verification code sent to your email"
              : "Sign in to continue"}
          </p>

          <AnimatePresence mode="wait">
            {step === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailLogin}
                className="space-y-6"
              >
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-cyan-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-cyan-400/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-cyan-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-cyan-400/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-cyan-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLogingIng}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-md"
                >
                  {isLogingIng ? "Signing In..." : "Continue"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-cyan-400/20 rounded-xl text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                {/* Timer */}
                <div className="text-center text-sm text-yellow-400">
                  {otpTimer > 0 ? (
                    <p className="flex justify-center items-center gap-1">
                      <Clock className="h-4 w-4" /> Code expires in{" "}
                      {formatTime(otpTimer)}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSigningUp || otpTimer === 0}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-md"
                >
                  {isSigningUp ? "Verifying..." : "Verify & Continue"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full text-cyan-400 hover:text-cyan-300 mt-2 text-sm"
                >
                  ← Back to Login
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* -------------------- RIGHT SIDE (Wallet Connect) -------------------- */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="bg-gray-800/60 backdrop-blur-md border border-purple-400/20 rounded-2xl p-8 shadow-lg flex flex-col justify-between"
        >
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 text-center">
              Connect Wallet
            </h2>
            <p className="text-purple-300 text-center mb-8">
              Secure login using your crypto wallet
            </p>

            <div className="max-w-sm mx-auto w-full">
              <WalletConnect showAsLogin={true} />
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm border-t border-purple-400/20 pt-6 mt-8">
            By connecting your wallet, you agree to our{" "}
            <a href="#" className="text-cyan-400 hover:text-cyan-300">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-cyan-400 hover:text-cyan-300">
              Privacy Policy
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
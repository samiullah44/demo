import { useEffect, useState } from "react";
import NavBar from "./components/NavBar"
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import HomePage from "./pages/HomePage"
import MarketPlace from "./pages/MarketPlace"
import Footer from "./components/Footer"
import TradingDashboard from "./pages/TradingDashboard"
import Portfolio from "./pages/Portfolio"
import Profile from "./pages/Profile"
import Settings from "./pages/Setting"
import LoginPage from "./pages/LoginPage"
import WalletConnect from "./components/WalletConnect"
import { useThemeStore } from "./store/useThemeStore";
import { useAuthStore } from "./store/useAuthStore";
import Collections from "./pages/Collections"
import toast, {Toaster} from "react-hot-toast"
import InscriptionDetail from './pages/InscriptionDetail';
import CollectionDetail from './pages/CollectionDetail';
import Leaderboard from "./components/Leaderboard";
import useWalletStore from "./store/useWalletStore";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!authUser) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
};

function WalletProtectedRoute({ children }) {
  const { walletAddress } = useWalletStore();
  const location = useLocation();

  if (!walletAddress) {
    toast.error("Connect Wallet!!")
    return <Navigate to="/connect-wallet" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route Component (redirect to home if already authenticated)
const PublicRoute = ({ children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (authUser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const { theme } = useThemeStore();
  const { checkAuth, authUser } = useAuthStore();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Check authentication on app start
  useEffect(() => {
    console.log("App starting, checking authentication...");
    checkAuth();
  }, [checkAuth]);

  // Debug auth state
  useEffect(() => {
    console.log("Current auth state:", { authUser });
  }, [authUser]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content">
      <NavBar onShowWalletModal={() => setShowWalletModal(true)} />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          } />
          <Route path="/marketplace" element={
            <ProtectedRoute>
              <MarketPlace />
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <WalletProtectedRoute>
              <Portfolio />
            </WalletProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/collections" element={
            <ProtectedRoute>
              <Collections />
            </ProtectedRoute>
          } />
          <Route path="/inscription/:id" element={ <ProtectedRoute>
              <InscriptionDetail />
            </ProtectedRoute>} />
            <Route path="/collection/:slug" element={<ProtectedRoute>
              <CollectionDetail />
            </ProtectedRoute>} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      
      {showWalletModal && (
        <WalletConnect onClose={() => setShowWalletModal(false)} />
      )}
      
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid rgba(34, 211, 238, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#22d3ee',
              secondary: '#1f2937',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1f2937',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
       <ScrollToTop />
      <AppContent />
    </Router>
  );
}

export default App;
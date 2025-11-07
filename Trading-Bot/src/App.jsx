import { useEffect, useState } from "react";
import NavBar from "./components/NavBar"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage"
import MarketPlace from "./pages/MarketPlace"
import Footer from "./components/Footer"
import TradingDashboard from "./pages/TradingDashboard"
import Portfolio from "./pages/Portfolio"
import Profile from "./pages/Profile"
import WalletConnect from "./components/WalletConnect"
import { useThemeStore } from "./store/useThemeStore";
import {Toaster} from "react-hot-toast"
import AuthFlipCard from "./components/AuthFlipCard";

function App() {
  const { theme } = useThemeStore();
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Router>
      <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content">
        <NavBar onShowWalletModal={() => setShowWalletModal(true)} />
        <main>
          <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/auth" element={<AuthFlipCard />} />
            <Route path="/profile" element={<Profile/>}/>
            <Route path="/analytics" element={<TradingDashboard/>}/>
            <Route path="/marketplace" element={<MarketPlace/>}/>
            <Route path="/settings" element={<Portfolio/>}/>
          </Routes>
        </main>
        <Footer/>
        
        {showWalletModal && (
          <WalletConnect onClose={() => setShowWalletModal(false)} />
        )}
        
        <Toaster position="top-right" reverseOrder={false}/>
      </div>
    </Router>
  )
}

export default App
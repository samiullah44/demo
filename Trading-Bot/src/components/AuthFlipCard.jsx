import React, { useState } from "react";
import { motion } from "framer-motion";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

const AuthFlipCard = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFlip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="relative w-full max-w-md perspective-1000">
        <motion.div
          className="relative w-full preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            duration: 1,
            ease: "easeInOut",
          }}
          onAnimationComplete={handleAnimationComplete}
        >
          <div className="w-full backface-hidden">
            <LoginPage onFlip={handleFlip} isVisible={!isFlipped} />
          </div>

          <div className="w-full backface-hidden rotate-y-180">
            <SignupPage onFlip={handleFlip} isVisible={isFlipped} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthFlipCard;
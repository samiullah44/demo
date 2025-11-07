import React from "react";

const SocialAuthButtons = () => (
  <div className="flex gap-4">
    <button
      type="button"
      className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-[#d4b241] to-[#c4ac56] text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
    >
      Continue with Google
    </button>
    <button
      type="button"
      className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white/70 text-gray-800 font-medium shadow-sm hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300"
    >
      {window.location.pathname.includes("login")
        ? "Login with OTP"
        : "Sign Up with OTP"}
    </button>
  </div>
);

export default SocialAuthButtons;
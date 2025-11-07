import React from "react";
import { User, Mail, Lock, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "../components/FormInput";
import PasswordChecklist from "../components/PasswordChecklist";
import { useAuthForm } from "../hooks/useAuthForm";
import SocialAuthButtons from "../components/SocialAuthButtons";
import AuthDivider from "../components/AuthDivider";

const SignupPage = ({ onFlip, isVisible }) => {
  const {
    formData,
    formState,
    isLoading,
    handlers: {
      handleInputChange,
      handleInputBlur,
      togglePasswordVisibility,
      setPasswordValidity,
      handleSubmit,
    },
    validation: { isValidEmail },
  } = useAuthForm("signup");

  const getNameError = () => {
    if ((formState.submitted || formState.touched.name) && !formData.name) {
      return "Full name is required";
    }
    return null;
  };

  const getEmailError = () => {
    if ((formState.submitted || formState.touched.email) && !formData.email) {
      return "Email is required";
    }
    if (
      (formState.submitted || formState.touched.email) &&
      formData.email &&
      !isValidEmail(formData.email)
    ) {
      return "Enter a valid email address";
    }
    return null;
  };

  const getPasswordError = () => {
    if (
      (formState.submitted || formState.touched.password) &&
      !formData.password
    ) {
      return "Password is required";
    }
    if (
      (formState.submitted || formState.touched.password) &&
      formData.password &&
      !formState.isPasswordValid
    ) {
      return "Password does not meet requirements";
    }
    return null;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 border border-gold/30 rounded-3xl shadow-2xl p-8 md:px-10 space-y-6 h-full flex flex-col justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gold/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-xl"></div>
        
        <div className="text-center space-y-3 relative z-10">
          <div className="flex justify-center items-center mb-2">
            <Crown className="w-8 h-8 text-gold mr-2" />
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
              Join the Elite
            </h1>
          </div>
          <p className="text-gray-300 text-sm md:text-base">
            Start your exclusive trading journey today
          </p>
        </div>

        <SocialAuthButtons />

        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <FormInput
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            placeholder="Enter your full name"
            icon={User}
            error={getNameError()}
            touched={formState.submitted || formState.touched.name}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur("name")}
            theme="dark"
          />

          <FormInput
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            placeholder="example@gmail.com"
            icon={Mail}
            error={getEmailError()}
            touched={formState.submitted || formState.touched.email}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur("email")}
            theme="dark"
          />

          <FormInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            placeholder="••••••••"
            icon={Lock}
            error={getPasswordError()}
            touched={formState.submitted || formState.touched.password}
            showPasswordToggle={true}
            isPasswordVisible={formState.showPassword}
            onPasswordToggle={togglePasswordVisibility}
            onChange={handleInputChange}
            onBlur={() => handleInputBlur("password")}
            theme="dark"
          />

          {formData.password && (
            <div className="transform transition-all duration-300 ease-in-out">
              <PasswordChecklist
                password={formData.password}
                onValidChange={setPasswordValidity}
                theme="dark"
              />
            </div>
          )}

          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={isLoading || !formState.isPasswordValid || !formData.name || !isValidEmail(formData.email)}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform ${
                formState.isPasswordValid &&
                formData.name &&
                isValidEmail(formData.email)
                  ? "bg-gradient-to-r from-gold via-gold-dark to-gold hover:scale-[1.02] hover:shadow-gold/20 hover:shadow-xl"
                  : "bg-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="animate-spin size-5" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Begin Your Journey
                </span>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-gray-400 text-sm relative z-10">
          Already have an account?{" "}
          <button
            onClick={onFlip}
            className="text-gold font-semibold hover:text-gold-light underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-gray-900 rounded px-2 py-1 transition-all duration-300"
          >
            Access Your Account
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default SignupPage;
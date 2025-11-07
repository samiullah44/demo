import React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
const FormInput = ({
  label,
  type = "text",
  name,
  value,
  placeholder,
  icon: Icon,
  error,
  touched,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onPasswordToggle,
  onChange,
  onBlur,
  ...props
}) => {
  const inputType = showPasswordToggle && isPasswordVisible ? "text" : type;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full pl-10 pr-${
            showPasswordToggle ? "10" : "3"
          } py-2.5 rounded-xl border bg-white/70 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all duration-200 ${
            error && touched ? "border-red-300" : "border-gray-300"
          }`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onPasswordToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#b6935c] transition-colors duration-200"
          >
            {isPasswordVisible ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        )}
      </div>
      {error && touched && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-xs mt-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default FormInput;
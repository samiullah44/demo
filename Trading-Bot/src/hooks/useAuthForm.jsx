import { useState, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

export const useAuthForm = (type = "login") => {
  const { login, signup, isLogingIn, isSigningUp } = useAuthStore();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [formState, setFormState] = useState({
    submitted: false,
    touched: { name: false, email: false, password: false },
    showPassword: false,
    isPasswordValid: false,
  });

  // Memoized validation functions
  const isValidEmail = useCallback(
    (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    []
  );

  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.email || !isValidEmail(formData.email)) {
      errors.push("Valid email is required");
    }

    if (!formData.password) {
      errors.push("Password is required");
    }

    if (type === "signup") {
      if (!formData.name?.trim()) {
        errors.push("Full name is required");
      }
      if (!formState.isPasswordValid) {
        errors.push("Password does not meet requirements");
      }
    }

    return errors;
  }, [formData, formState.isPasswordValid, type, isValidEmail]);

  // Memoized event handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleInputBlur = useCallback((fieldName) => {
    setFormState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: true },
    }));
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      showPassword: !prev.showPassword,
    }));
  }, []);

  const setPasswordValidity = useCallback((isValid) => {
    setFormState((prev) => ({ ...prev, isPasswordValid: isValid }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormState((prev) => ({ ...prev, submitted: true }));

      const errors = validateForm();
      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      try {
        if (type === "login") {
          await login(formData);
        } else {
          await signup(formData);
        }
      } catch (error) {
        // Error handling is done in the store
      }
    },
    [formData, type, validateForm, login, signup]
  );

  return {
    formData,
    formState,
    isLoading: type === "login" ? isLogingIn : isSigningUp,
    handlers: {
      handleInputChange,
      handleInputBlur,
      togglePasswordVisibility,
      setPasswordValidity,
      handleSubmit,
    },
    validation: {
      isValidEmail,
      validateForm,
    },
  };
};
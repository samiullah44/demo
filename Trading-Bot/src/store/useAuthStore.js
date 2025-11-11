import { create } from "zustand";
import { persist } from 'zustand/middleware';
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authUser: null,
      isSigningUp: false,
      isLogingIng: false,
      isUpdatingProfile: false,
      isCheckingAuth: true,

      checkAuth: async () => {
        try {
          const res = await axiosInstance.get("/user/check");
          if (res.data) {
            set({ authUser: res.data });
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          set({ authUser: null });
        } finally {
          set({ isCheckingAuth: false });
        }
      },

      // Auth method for login/OTP flow
      auth: async (data) => {
        set({ isLogingIng: true });
        try {
          const res = await axiosInstance.post("/user/auth", data);
          
          if (res.data.otp_sent) {
            return { 
              success: true, 
              otp_sent: true, 
              message: res.data.message 
            };
          } else {
            // Set user data immediately after successful login
            set({ authUser: res.data.user });
            toast.success("Logged in successfully");
            return { 
              success: true, 
              user: res.data.user, 
              token: res.data.token 
            };
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Authentication failed";
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } finally {
          set({ isLogingIng: false });
        }
      },

      // Verify OTP and create account
      verifyOtp: async (data) => {
        set({ isSigningUp: true });
        try {
          const res = await axiosInstance.post("/user/verify", data);
          set({ authUser: res.data.user });
          toast.success("Account created successfully");
          return { 
            success: true, 
            user: res.data.user, 
            token: res.data.token 
          };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Verification failed";
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } finally {
          set({ isSigningUp: false });
        }
      },

      // Set user from wallet connection
      setUserFromWallet: (walletData) => {
        const user = {
          _id: `wallet-${walletData.address}`,
          username: `wallet_${walletData.address.slice(2, 8)}`,
          email: null,
          walletAddress: walletData.address,
          walletType: walletData.walletType,
          isWalletUser: true,
          created_at: new Date().toISOString(),
        };
        set({ authUser: user });
        return user;
      },

      logout: async () => {
        try {
          await axiosInstance.post("/user/logout");
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({ authUser: null });
          toast.success("Logged out successfully");
        }
      },

      updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
          const res = await axiosInstance.put("/user/update-profile", data);
          set({ authUser: res.data });
          toast.success("Profile updated successfully");
        } catch (error) {
          toast.error(error.response?.data?.message);
        } finally {
          set({ isUpdatingProfile: false });
        }
      },

      // Helper methods
      setAuthUser: (user) => set({ authUser: user }),
      clearError: () => {},
    }),
    {
      name: "auth-storage",
    }
  )
);
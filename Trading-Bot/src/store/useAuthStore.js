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
            // ✅ FIXED: Use functional update
            set((state) => ({ 
              ...state, 
              authUser: res.data 
            }));
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          // ✅ FIXED: Only clear if it's an auth error, not network error
          if (error.response?.status === 401) {
            set((state) => ({ 
              ...state, 
              authUser: null 
            }));
          }
        } finally {
          set((state) => ({ 
            ...state, 
            isCheckingAuth: false 
          }));
        }
      },

      // Auth method for login/OTP flow
      auth: async (data) => {
        set((state) => ({ 
          ...state, 
          isLogingIng: true 
        }));
        
        try {
          const res = await axiosInstance.post("/user/auth", data);
          
          if (res.data.otp_sent) {
            return { 
              success: true, 
              otp_sent: true, 
              message: res.data.message 
            };
          } else {
            // ✅ FIXED: Use functional update with proper state merging
            set((state) => ({ 
              ...state, 
              authUser: res.data.user 
            }));
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
          set((state) => ({ 
            ...state, 
            isLogingIng: false 
          }));
        }
      },

      // Verify OTP and create account
      verifyOtp: async (data) => {
        set((state) => ({ 
          ...state, 
          isSigningUp: true 
        }));
        
        try {
          const res = await axiosInstance.post("/user/verify", data);
          // ✅ FIXED: Use functional update
          set((state) => ({ 
            ...state, 
            authUser: res.data.user 
          }));
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
          set((state) => ({ 
            ...state, 
            isSigningUp: false 
          }));
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
        // ✅ FIXED: Use functional update
        set((state) => ({ 
          ...state, 
          authUser: user 
        }));
        toast.success("Wallet connected successfully");
        return user;
      },

      logout: async () => {
        try {
          await axiosInstance.post("/user/logout");
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // ✅ FIXED: Use functional update and add small delay for state propagation
          setTimeout(() => {
            set((state) => ({ 
              ...state, 
              authUser: null 
            }));
          }, 10);
          toast.success("Logged out successfully");
        }
      },

      updateProfile: async (data) => {
        set((state) => ({ 
          ...state, 
          isUpdatingProfile: true 
        }));
        
        try {
          const res = await axiosInstance.put("/user/update-profile", data);
          set((state) => ({ 
            ...state, 
            authUser: res.data 
          }));
          toast.success("Profile updated successfully");
        } catch (error) {
          toast.error(error.response?.data?.message);
        } finally {
          set((state) => ({ 
            ...state, 
            isUpdatingProfile: false 
          }));
        }
      },

      // Helper methods
      setAuthUser: (user) => set((state) => ({ 
        ...state, 
        authUser: user 
      })),
      clearError: () => {},
      
      // ✅ NEW: Force state refresh method
      forceRefresh: () => {
        // This forces Zustand to notify all subscribers
        set((state) => ({ ...state }));
      },
    }),
    {
      name: "auth-storage",
      // ✅ FIXED: Add version for migrations
      version: 1,
      // ✅ FIXED: Add partialize to control what gets persisted
      partialize: (state) => ({
        authUser: state.authUser,
      }),
    }
  )
);
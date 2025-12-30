// src/store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  loginResponse: null, // Stores complete login response with all user data
  accessToken: null,
  contextData: null,
  soldTo: null,
  salesOrg: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action?.payload ?? false;
    },
    setLoading: (state, action) => {
      state.isLoading = action?.payload ?? true;
    },
    setUser: (state, action) => {
      // Ensure soldToId is preserved/included in user object
      const newUser = action?.payload ?? null;
      if (newUser && !newUser.soldToId && state.soldTo) {
        // If soldToId is missing from user but exists in state.soldTo, add it
        state.user = { ...newUser, soldToId: state.soldTo };
      } else {
        state.user = newUser;
      }
    },
    setLoginResponse: (state, action) => {
      // Store complete login response with all user profile data
      const response = action?.payload ?? null;
      state.loginResponse = response;
      
      // Also extract key fields for direct access
      if (response) {
        // Extract bearer token - handle both direct and nested cases
        const extractedToken = response.tokens?.bearerToken || response.bearerToken || response.accessToken;
        
        // Ensure accessToken is always a string, never an object
        if (extractedToken && typeof extractedToken === 'string') {
          state.accessToken = extractedToken;
        } else if (extractedToken && typeof extractedToken === 'object') {
          console.error('❌ accessToken is an object, not a string:', extractedToken);
          state.accessToken = null;
        } else {
          state.accessToken = extractedToken;
        }
        
        state.soldTo = response.userProfile?.defaultContext?.[0]?.soldToId || response.soldToId;
        state.salesOrg = response.userProfile?.defaultContext?.[0]?.salesOrgId || response.salesOrgId;
      }
    },
    setAccessToken: (state, action) => {
      state.accessToken = action?.payload ?? null;
    },
    setContextData: (state, action) => {
      state.contextData = action?.payload ?? null;
    },
    setSoldTo: (state, action) => {
      state.soldTo = action?.payload ?? null;
    },
    setSalesOrg: (state, action) => {
      state.salesOrg = action?.payload ?? null;
    },
    initializeAuth: (state, action) => {
      // Safely handle payload with fallback
      const payload = action?.payload;
      
      // If no payload or payload is not an object, return current state
      if (!payload || typeof payload !== 'object') {
        console.warn('⚠️ initializeAuth called with invalid payload:', payload);
        return state;
      }
      
      // Ensure accessToken is always a string before merging into state
      if (payload.accessToken && typeof payload.accessToken !== 'string') {
        console.error('❌ initializeAuth: accessToken is not a string, extracting from tokens:', payload.accessToken);
        payload.accessToken = payload.accessToken?.bearerToken || payload.loginResponse?.tokens?.bearerToken || null;
      }
      
      return { ...state, ...payload };
    },
    clearAuth: (state) => {
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        loginResponse: null,
        accessToken: null,
        contextData: null,
        soldTo: null,
        salesOrg: null,
      };
    },
  },
});

export const {
  setAuthenticated,
  setLoading,
  setUser,
  setLoginResponse,
  setAccessToken,
  setContextData,
  setSoldTo,
  setSalesOrg,
  initializeAuth,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;
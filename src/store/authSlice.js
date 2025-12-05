// src/store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  loginResponse: null,
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
      state.user = action?.payload ?? null;
    },
    setLoginResponse: (state, action) => {
      state.loginResponse = action?.payload ?? null;
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
      return { ...state, ...(action?.payload ?? {}) };
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
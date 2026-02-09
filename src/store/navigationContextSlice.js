// src/store/navigationContextSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  context: null, // Navigation context (e.g., error messages to show on redirect)
  lastError: null, // Last network/auth error
  redirectReason: null, // Reason for redirect (e.g., 'network_error', 'auth_failed')
};

const navigationContextSlice = createSlice({
  name: 'navigationContext',
  initialState,
  reducers: {
    setNavigationContext: (state, action) => {
      state.context = action.payload;
    },
    setLastError: (state, action) => {
      state.lastError = action.payload;
    },
    setRedirectReason: (state, action) => {
      state.redirectReason = action.payload;
    },
    clearNavigationContext: (state) => {
      state.context = null;
      state.lastError = null;
      state.redirectReason = null;
    },
  },
});

export const {
  setNavigationContext,
  setLastError,
  setRedirectReason,
  clearNavigationContext,
} = navigationContextSlice.actions;

export default navigationContextSlice.reducer;

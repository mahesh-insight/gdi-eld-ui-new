import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  isLoading: true,
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
      state.isAuthenticated = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setLoginResponse: (state, action) => {
      state.loginResponse = action.payload;
    },
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },
    setContextData: (state, action) => {
      state.contextData = action.payload;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loginResponse = null;
      state.accessToken = null;
      state.contextData = null;
      state.soldTo = null;
      state.salesOrg = null;
      state.isLoading = false;
    },
    initializeAuth: (state, action) => {
      const { isAuthenticated, user, loginResponse, accessToken, contextData, soldTo, salesOrg } = action.payload;
      state.isAuthenticated = isAuthenticated;
      state.user = user;
      state.loginResponse = loginResponse;
      state.accessToken = accessToken;
      state.isLoading = false;
      if (contextData !== undefined) {
        state.contextData = contextData;
      }
      if (soldTo !== undefined) {
        state.soldTo = soldTo;
      }
      if (salesOrg !== undefined) {
        state.salesOrg = salesOrg;
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action) => {
      state.isLoading = false;
    });
  },
});

export const {
  setAuthenticated,
  setLoading,
  setUser,
  setLoginResponse,
  setAccessToken,
  clearAuth,
  initializeAuth,
  setContextData
} = authSlice.actions;

export default authSlice.reducer;
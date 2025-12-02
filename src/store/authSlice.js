import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  loginResponse: null,
  accessToken: null,
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
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loginResponse = null;
      state.accessToken = null;
      state.isLoading = false;
    },
    initializeAuth: (state, action) => {
      const { isAuthenticated, user, loginResponse, accessToken } = action.payload;
      state.isAuthenticated = isAuthenticated;
      state.user = user;
      state.loginResponse = loginResponse;
      state.accessToken = accessToken;
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action) => {
      // Always set loading to false after rehydration
      state.isLoading = false;
      console.log('🔄 Redux Persist REHYDRATE completed', action.payload?.auth);
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
  initializeAuth
} = authSlice.actions;

export default authSlice.reducer;
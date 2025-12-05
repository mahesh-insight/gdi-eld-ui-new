// src/store/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedSoldToId: null,
  preferences: {},
  permissions: [],
  profile: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedSoldToId: (state, action) => {
      state.selectedSoldToId = action?.payload ?? null;
    },
    setPreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setPermissions: (state, action) => {
      state.permissions = action.payload;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    clearUser: (state) => {
      return initialState;
    },
  },
});

export const {
  setSelectedSoldToId,
  setPreferences,
  setPermissions,
  setProfile,
  clearUser,
} = userSlice.actions;

export default userSlice.reducer;
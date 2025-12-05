// src/store/uiSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  properties: null,
  theme: 'light',
  sidebarOpen: false,
  loading: false,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setProperties: (state, action) => {
      state.properties = action?.payload ?? null;
    },
    setTheme: (state, action) => {
      state.theme = action?.payload ?? 'light';
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action?.payload ?? false;
    },
    setLoading: (state, action) => {
      state.loading = action?.payload ?? false;
    },
    addNotification: (state, action) => {
      if (action?.payload) {
        state.notifications.push(action.payload);
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action?.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  setProperties,
  setTheme,
  setSidebarOpen,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
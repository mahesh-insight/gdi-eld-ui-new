// src/store/pageSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  intlLocalProvider: 'en-US',
  currentPage: null,
  breadcrumbs: [],
  pageTitle: '',
};

const pageSlice = createSlice({
  name: 'page',
  initialState,
  reducers: {
    setIntlLocalProvider: (state, action) => {
      state.intlLocalProvider = action?.payload ?? 'en-US';
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action?.payload ?? null;
    },
    setBreadcrumbs: (state, action) => {
      state.breadcrumbs = action?.payload ?? [];
    },
    setPageTitle: (state, action) => {
      state.pageTitle = action?.payload ?? '';
    },
  },
});

export const {
  setIntlLocalProvider,
  setCurrentPage,
  setBreadcrumbs,
  setPageTitle,
} = pageSlice.actions;

export default pageSlice.reducer;
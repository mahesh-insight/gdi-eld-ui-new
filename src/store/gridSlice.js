// src/store/gridSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  settings: {},
  columns: [],
  filters: {},
  sorting: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },
};

const gridSlice = createSlice({
  name: 'grid',
  initialState,
  reducers: {
    setSettings: (state, action) => {
      state.settings = { ...state.settings, ...(action?.payload ?? {}) };
    },
    setColumns: (state, action) => {
      state.columns = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSorting: (state, action) => {
      state.sorting = action.payload;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearGrid: (state) => {
      return initialState;
    },
  },
});

export const {
  setSettings,
  setColumns,
  setFilters,
  setSorting,
  setPagination,
  clearGrid,
} = gridSlice.actions;

export default gridSlice.reducer;
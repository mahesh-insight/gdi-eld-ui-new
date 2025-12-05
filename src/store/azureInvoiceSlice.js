// src/store/azureInvoiceSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  loading: false,
  error: null,
  invoiceMonths: [],
  selectedMonth: null,
  filters: {
    productCategory: 'All',
    productName: 'All',
    skuName: 'All',
  },
};

const azureInvoiceSlice = createSlice({
  name: 'azureInvoice',
  initialState,
  reducers: {
    setData: (state, action) => {
      state.data = action?.payload ?? null;
    },
    setLoading: (state, action) => {
      state.loading = action?.payload ?? false;
    },
    setError: (state, action) => {
      state.error = action?.payload ?? null;
    },
    setInvoiceMonths: (state, action) => {
      state.invoiceMonths = action?.payload ?? [];
    },
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action?.payload ?? null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...(action?.payload ?? {}) };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearData: (state) => {
      return initialState;
    },
  },
});

export const {
  setData,
  setLoading,
  setError,
  setInvoiceMonths,
  setSelectedMonth,
  setFilters,
  resetFilters,
  clearData,
} = azureInvoiceSlice.actions;

export default azureInvoiceSlice.reducer;
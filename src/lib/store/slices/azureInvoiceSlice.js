// src/lib/store/slices/azureInvoiceSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Data cache
  invoiceMonths: [],
  currentMonth: null,
  usageMonth: null,
  usageMonthDifference: null,
  
  // Summary data
  summary: null,
  spendPeriod: {},
  topNExpensiveProducts: [],
  pieChartData: [],
  
  // Credits data
  credits: null,
  totalSpend: 0,
  
  // Trend data
  trend: null,
  invoiceTrendData: [],
  
  // Month detail data
  monthDetail: null,
  invoiceMonthDetail: [],
  totalInvoiceMonthDetail: null,
  
  // UI state
  loading: false,
  error: null,
  lastFetched: null,
  
  // Filter states
  appliedFilters: [],
  selectedMonth: null,
  
  // Cache management
  dataExpiry: 15 * 60 * 1000, // 15 minutes cache
};

const azureInvoiceSlice = createSlice({
  name: 'azureInvoice',
  initialState,
  reducers: {
    // UI state updates (no API calls)
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    
    setAppliedFilters: (state, action) => {
      state.appliedFilters = action.payload;
    },
    
    updatePieChartData: (state, action) => {
      state.pieChartData = action.payload;
    },
    
    updateSpendPeriod: (state, action) => {
      state.spendPeriod = action.payload;
    },
    
    updateTopNExpensiveProducts: (state, action) => {
      state.topNExpensiveProducts = action.payload;
    },
    
    // Cache management
    clearCache: (state) => {
      Object.assign(state, initialState);
    },
    
    // Set complete initial data (from server-side)
    setInitialData: (state, action) => {
      const data = action.payload;
      
      state.invoiceMonths = data.invoiceMonths || [];
      state.currentMonth = data.currentMonthObject || null;
      state.usageMonth = data.usageMonth || null;
      state.usageMonthDifference = data.usageMonthDifference || null;
      
      // Summary data
      if (data.summary) {
        state.summary = data.summary;
        state.spendPeriod = data.summary.spendPeriod || {};
        state.topNExpensiveProducts = data.summary.topNExpensiveProducts?.spend || [];
        state.pieChartData = (data.summary.topNExpensiveProducts?.spend || []).map(p => ({
          category: p.label,
          value: p.value,
          group: p.group,
          label: p.label,
          clickKey: p.clickKey,
        }));
      }
      
      // Credits data
      if (data.credits) {
        state.credits = data.credits;
        state.totalSpend = data.credits.totalSpend || 0;
      }
      
      // Trend data  
      if (data.trend) {
        state.trend = data.trend;
        state.invoiceTrendData = data.trend.chartData || [];
      }
      
      state.lastFetched = Date.now();
      state.loading = false;
      state.error = null;
    },
  },
});

// Selectors
export const selectAzureInvoiceData = (state) => state.azureInvoice;
export const selectAzureInvoiceLoading = (state) => state.azureInvoice?.loading || false;
export const selectAzureInvoiceError = (state) => state.azureInvoice?.error;
export const selectInvoiceMonths = (state) => state.azureInvoice?.invoiceMonths || [];
export const selectCurrentMonth = (state) => state.azureInvoice?.currentMonth;
export const selectSummaryData = (state) => state.azureInvoice?.summary;
export const selectCreditsData = (state) => state.azureInvoice?.credits;
export const selectTrendData = (state) => state.azureInvoice?.trend;
export const selectPieChartData = (state) => state.azureInvoice?.pieChartData || [];
export const selectInvoiceTrendData = (state) => state.azureInvoice?.invoiceTrendData || [];
export const selectTotalSpend = (state) => state.azureInvoice?.totalSpend || 0;
export const selectSpendPeriod = (state) => state.azureInvoice?.spendPeriod || {};
export const selectTopNExpensiveProducts = (state) => state.azureInvoice?.topNExpensiveProducts || [];

// Cache validation
export const selectIsCacheValid = (state) => {
  const lastFetched = state.azureInvoice?.lastFetched;
  const expiry = state.azureInvoice?.dataExpiry;
  
  if (!lastFetched) return false;
  
  return Date.now() - lastFetched < expiry;
};

export const {
  setSelectedMonth,
  setAppliedFilters,
  updatePieChartData,
  updateSpendPeriod,
  updateTopNExpensiveProducts,
  clearCache,
  setInitialData
} = azureInvoiceSlice.actions;

export default azureInvoiceSlice.reducer;
// src/store/azureInvoiceSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Core data
  data: null,
  loading: false,
  error: null,
  
  // SSR data caching
  monthsData: null,
  summaryData: null,
  creditsData: null,
  trendsData: null,
  
  // Month-specific cache (keyed by month value)
  monthDataCache: {},
  
  // UI state
  invoiceMonths: [],
  selectedMonth: null,
  processedChartData: {
    invoiceBreakdownData: [],
    monthlyTrendData: [],
    topExpensiveData: [],
    creditsApplied: 0
  },
  selectListOptions: {
    productCategory: [{ text: 'All', value: 'All' }],
    productName: [{ text: 'All', value: 'All' }],
    skuName: [{ text: 'All', value: 'All' }]
  },
  
  // Filters
  filters: {
    productCategory: 'All',
    productName: 'All',
    skuName: 'All',
  },
  
  // Cache metadata
  cacheMetadata: {
    lastUpdated: null,
    soldToId: null,
    sessionId: null,
    version: '1.0.0'
  }
};

const azureInvoiceSlice = createSlice({
  name: 'azureInvoice',
  initialState,
  reducers: {
    // Legacy actions for backward compatibility
    setData: (state, action) => {
      state.data = action?.payload ?? null;
    },
    setLoading: (state, action) => {
      state.loading = action?.payload ?? false;
    },
    setError: (state, action) => {
      state.error = action?.payload ?? null;
    },
    
    // SSR Data caching actions
    setInitialSSRData: (state, action) => {
      if (!action?.payload) {
        console.warn('🏪 REDUX: setInitialSSRData called with no payload');
        return;
      }
      
      // Safely destructure with defaults to prevent undefined errors
      const { 
        monthsData = null, 
        summaryData = null, 
        creditsData = null, 
        trendsData = null, 
        userContext = null 
      } = action.payload || {};
      
      console.log('🏪 REDUX: Setting initial SSR data:', {
        hasPayload: !!action.payload,
        monthsData: !!monthsData,
        summaryData: !!summaryData,
        creditsData: !!creditsData,
        trendsData: !!trendsData,
        soldToId: userContext?.soldToId?.substring(0, 20) + '...' || 'N/A'
      });
      
      // Cache raw data
      state.monthsData = monthsData;
      state.summaryData = summaryData;
      state.creditsData = creditsData;
      state.trendsData = trendsData;
      state.loading = false;
      state.error = null;
      
      // Process and cache UI-ready data
      if (monthsData?.invoiceMonths) {
        state.invoiceMonths = monthsData.invoiceMonths.map(month => ({
          text: month.text,
          value: month.value,
          date: month.date
        }));
        if (state.invoiceMonths.length > 0) {
          state.selectedMonth = state.invoiceMonths[0];
        }
      }

      if (summaryData?.selectLists) {
        const lists = {
          productCategory: [{ text: 'All', value: 'All' }],
          productName: [{ text: 'All', value: 'All' }],
          skuName: [{ text: 'All', value: 'All' }]
        };
        summaryData.selectLists.forEach(selectList => {
          if (selectList?.items?.length > 0) {
            const processedItems = selectList.items.map(item => ({
              text: item?.label || item?.text || item?.name || item?.value || String(item),
              value: item?.value || item?.label || item?.text || item?.name || String(item)
            }));
            const finalList = [{ text: 'All', value: 'All' }, ...processedItems];
            if (selectList.name === 'productcategory') lists.productCategory = finalList;
            else if (selectList.name === 'productname') lists.productName = finalList;
            else if (selectList.name === 'skuname') lists.skuName = finalList;
          }
        });
        state.selectListOptions = lists;
      }

      // Update cache metadata
      state.cacheMetadata = {
        lastUpdated: Date.now(),
        soldToId: userContext?.soldToId,
        sessionId: `${userContext?.soldToId || 'unknown'}-${Date.now()}`,
        version: '1.1.0' // Incremented version
      };
    },
    
    // Month-specific data caching
    setMonthData: (state, action) => {
      if (!action?.payload) {
        console.warn('🏪 REDUX: setMonthData called without payload');
        return;
      }
      // Safely destructure with defaults to prevent undefined errors
      const { 
        monthValue = null, 
        summaryData = null, 
        creditsData = null, 
        trendsData = null 
      } = action.payload || {};
      
      if (!monthValue) {
        console.warn('🏪 REDUX: No monthValue provided for caching');
        return;
      }
      
      console.log('🏪 REDUX: Caching month data for:', monthValue);
      
      // Cache month-specific data
      state.monthDataCache[monthValue] = {
        summaryData,
        creditsData,
        trendsData,
        timestamp: Date.now()
      };
      
      // Update current data and track which month is currently displayed
      state.summaryData = summaryData;
      state.creditsData = creditsData;
      state.trendsData = trendsData;
      state.cacheMetadata.currentMonth = monthValue;
    },
    
    // Processed data actions
    setProcessedChartData: (state, action) => {
      console.log('🏪 REDUX: Setting processed chart data:', action.payload);
      state.processedChartData = action?.payload || initialState.processedChartData;
    },
    
    setSelectListOptions: (state, action) => {
      console.log('🏪 REDUX: Setting select list options:', action.payload);
      state.selectListOptions = action?.payload || initialState.selectListOptions;
    },
    
    // UI state actions
    setInvoiceMonths: (state, action) => {
      console.log('🏪 REDUX: Setting invoice months:', action.payload?.length || 0);
      state.invoiceMonths = action?.payload ?? [];
    },
    
    setSelectedMonth: (state, action) => {
      console.log('🏪 REDUX: Setting selected month:', {
        text: action.payload?.text,
        value: action.payload?.value,
        date: action.payload?.date,
        fullPayload: action.payload
      });
      state.selectedMonth = action?.payload ?? null;
      // Track which month is currently selected for data sync on page load
      if (action.payload?.value) {
        state.cacheMetadata.currentMonth = action.payload.value;
      }
    },
    
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...(action?.payload ?? {}) };
    },
    
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    // Cache management actions
    getCachedMonthData: (state, action) => {
      const monthValue = action?.payload;
      if (!monthValue) {
        console.warn('🏪 REDUX: getCachedMonthData called without monthValue');
        return;
      }
      const cached = state.monthDataCache[monthValue];
      
      if (cached) {
        console.log('🏪 REDUX: Retrieved cached data for month:', monthValue);
        state.summaryData = cached.summaryData;
        state.creditsData = cached.creditsData;
        state.trendsData = cached.trendsData;
        // Don't return anything when mutating state
      } else {
        console.log('🏪 REDUX: No cached data found for month:', monthValue);
      }
    },
    
    clearCache: (state) => {
      console.log('🏪 REDUX: Clearing all cached data');
      state.monthDataCache = {};
      state.cacheMetadata.lastUpdated = null;
    },
    
    clearData: (state) => {
      console.log('🏪 REDUX: Clearing all Azure Invoice data');
      // Reset all properties to initial values instead of returning initialState
      Object.assign(state, initialState);
    },
    
    // Session validation
    validateSession: (state, action) => {
      if (!action?.payload) {
        console.warn('🏪 REDUX: validateSession called without payload');
        return;
      }
      const { soldToId } = action.payload || {};
      
      if (state.cacheMetadata.soldToId !== soldToId) {
        console.log('🏪 REDUX: Session changed, clearing cache');
        state.monthDataCache = {};
        state.cacheMetadata.soldToId = soldToId;
        state.cacheMetadata.lastUpdated = null;
      }
      // Don't return anything when mutating state
    }
  },
});

export const {
  // Legacy actions
  setData,
  setLoading,
  setError,
  
  // SSR Data actions
  setInitialSSRData,
  setMonthData,
  
  // Processed data actions
  setProcessedChartData,
  setSelectListOptions,
  
  // UI state actions
  setInvoiceMonths,
  setSelectedMonth,
  setFilters,
  resetFilters,
  
  // Cache management actions
  getCachedMonthData,
  clearCache,
  clearData,
  validateSession
} = azureInvoiceSlice.actions;

// Selectors for easy data access
export const selectAzureInvoiceData = (state) => state.azureInvoice;
export const selectProcessedChartData = (state) => state.azureInvoice.processedChartData;
export const selectInvoiceMonths = (state) => state.azureInvoice.invoiceMonths;
export const selectSelectedMonth = (state) => state.azureInvoice.selectedMonth;
export const selectSelectListOptions = (state) => state.azureInvoice.selectListOptions;
export const selectCacheMetadata = (state) => state.azureInvoice.cacheMetadata;
export const selectMonthDataCache = (state) => state.azureInvoice.monthDataCache;

export default azureInvoiceSlice.reducer;
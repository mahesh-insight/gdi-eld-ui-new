// src/lib/store/slices/uiSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching UI properties
export const fetchUiProperties = createAsyncThunk(
  'ui/fetchUiProperties',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if we already have valid cached data
      const state = getState();
      if (state.ui?.properties && selectUiCacheValid(state)) {
        console.log('📋 Using cached UI properties');
        return state.ui.properties;
      }
      
      // Import dynamically to avoid circular dependency
      const { getUiProperties } = await import('../../server-config');
      const uiProps = await getUiProperties();
      
      if (!uiProps) {
        console.warn('⚠️ UI properties service unavailable, using defaults');
        // Return minimal default properties instead of failing
        return {
          CCR_ARCHERA_URL: '',
          flags: {}
        };
      }
      
      console.log('✅ UI Properties fetched and stored in Redux:', Object.keys(uiProps));
      return uiProps;
    } catch (error) {
      console.error('❌ Failed to fetch UI properties:', error.message);
      
      // Return default properties instead of failing completely
      console.log('🔧 Using default UI properties due to fetch error');
      return {
        CCR_ARCHERA_URL: '',
        flags: {}
      };
    }
  }
);

const initialState = {
  properties: null,
  loading: false,
  error: null,
  lastFetched: null,
  // Cache UI properties for 5 minutes
  cacheExpiry: 5 * 60 * 1000
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    clearUiProperties: (state) => {
      state.properties = null;
      state.error = null;
      state.lastFetched = null;
    },
    setUiProperty: (state, action) => {
      const { key, value } = action.payload;
      if (state.properties) {
        state.properties[key] = value;
      }
    },
    setUiProperties: (state, action) => {
      state.properties = action.payload;
      state.error = null;
      state.lastFetched = Date.now();
      state.loading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUiProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUiProperties.fulfilled, (state, action) => {
        state.loading = false;
        state.properties = action.payload;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchUiProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Unknown error';
        state.properties = null;
      });
  },
});

// Selectors
export const selectUiProperties = (state) => state.ui?.properties;
export const selectUiLoading = (state) => state.ui?.loading || false;
export const selectUiError = (state) => state.ui?.error;
export const selectUiProperty = (key) => (state) => state.ui?.properties?.[key];

// Helper selector to check if cache is valid
export const selectUiCacheValid = (state) => {
  const lastFetched = state.ui?.lastFetched;
  const cacheExpiry = state.ui?.cacheExpiry;
  
  if (!lastFetched) return false;
  
  return Date.now() - lastFetched < cacheExpiry;
};

export const { clearUiProperties, setUiProperty, setUiProperties } = uiSlice.actions;
export default uiSlice.reducer;
// src/lib/store/slices/gridSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Grid configuration states
  applyMinWidthState: false,
  gridCurrentOffsetState: false,
  gridColumnsState: [],
  
  // Grid data states
  gridResponse: [],
  downloadGridResponse: false,
  handleGridResponse: false,
  scheduledDownloadgridResponse: '',
  pendingDownloadGridResponse: false,
  
  // Grid filter states
  appliedFilterURLState: '',
  markUpState: '',
  
  // Other grid-related states
  gridSortState: [],
  gridFilterState: null,
  gridPaginationState: {
    page: 0,
    pageSize: 10,
    total: 0
  },
  gridSelectionState: [],
  gridExpandedRowsState: [],
  gridLoadingState: false,
  gridErrorState: null,
  viewBilledUsage: false,
  initialColumnWidth: null,
};

const gridSlice = createSlice({
  name: 'grid',
  initialState,
  reducers: {
    // Grid configuration actions
    setApplyMinWidthState: (state, action) => {
      state.applyMinWidthState = action.payload;
    },
    setGridCurrentOffsetState: (state, action) => {
      state.gridCurrentOffsetState = action.payload;
    },
    setGridColumnsState: (state, action) => {
      state.gridColumnsState = action.payload;
    },
    
    // Grid data actions
    setGridResponse: (state, action) => {
      state.gridResponse = action.payload;
    },
    appendGridResponse: (state, action) => {
      state.gridResponse = [...state.gridResponse, ...action.payload];
    },
    setDownloadGridResponse: (state, action) => {
      state.downloadGridResponse = action.payload;
    },
    setHandleGridResponse: (state, action) => {
      state.handleGridResponse = action.payload;
    },
    setScheduledDownloadgridResponse: (state, action) => {
      state.scheduledDownloadgridResponse = action.payload;
    },
    setPendingDownloadGridResponse: (state, action) => {
      state.pendingDownloadGridResponse = action.payload;
    },
    
    // Grid filter actions
    setAppliedFilterURLState: (state, action) => {
      state.appliedFilterURLState = action.payload;
    },
    setMarkUpState: (state, action) => {
      state.markUpState = action.payload;
    },
    
    // Grid operation actions
    setGridSortState: (state, action) => {
      state.gridSortState = action.payload;
    },
    setGridSort: (state, action) => {
      state.gridSortState = action.payload;
    },
    setViewBilledUsage: (state, action) => {
      state.viewBilledUsage = action.payload;
    },
    setInitialColumnWidth: (state, action) => {
      state.initialColumnWidth = action.payload;
    },
    setGridFilterState: (state, action) => {
      state.gridFilterState = action.payload;
    },
    setGridPaginationState: (state, action) => {
      state.gridPaginationState = { ...state.gridPaginationState, ...action.payload };
    },
    setGridSelectionState: (state, action) => {
      state.gridSelectionState = action.payload;
    },
    addGridSelection: (state, action) => {
      if (!state.gridSelectionState.includes(action.payload)) {
        state.gridSelectionState.push(action.payload);
      }
    },
    removeGridSelection: (state, action) => {
      state.gridSelectionState = state.gridSelectionState.filter(item => item !== action.payload);
    },
    clearGridSelection: (state) => {
      state.gridSelectionState = [];
    },
    setGridExpandedRowsState: (state, action) => {
      state.gridExpandedRowsState = action.payload;
    },
    toggleGridExpandedRow: (state, action) => {
      const rowId = action.payload;
      if (state.gridExpandedRowsState.includes(rowId)) {
        state.gridExpandedRowsState = state.gridExpandedRowsState.filter(id => id !== rowId);
      } else {
        state.gridExpandedRowsState.push(rowId);
      }
    },
    
    // Grid status actions
    setGridLoadingState: (state, action) => {
      state.gridLoadingState = action.payload;
    },
    setGridErrorState: (state, action) => {
      state.gridErrorState = action.payload;
    },
    
    // Clear grid state (utility action)
    clearGridState: (state) => {
      return initialState;
    },
    
    // Reset grid to initial data state but keep configuration
    resetGridData: (state) => {
      state.gridResponse = [];
      state.downloadGridResponse = false;
      state.handleGridResponse = false;
      state.scheduledDownloadgridResponse = '';
      state.pendingDownloadGridResponse = false;
      state.gridSelectionState = [];
      state.gridExpandedRowsState = [];
      state.gridLoadingState = false;
      state.gridErrorState = null;
    }
  },
});

export const {
  // Grid configuration actions
  setApplyMinWidthState,
  setGridCurrentOffsetState,
  setGridColumnsState,
  
  // Grid data actions
  setGridResponse,
  appendGridResponse,
  setDownloadGridResponse,
  setHandleGridResponse,
  setScheduledDownloadgridResponse,
  setPendingDownloadGridResponse,
  
  // Grid filter actions
  setAppliedFilterURLState,
  setMarkUpState,
  
  // Grid operation actions
  setGridSortState,
  setGridSort,
  setGridFilterState,
  setGridPaginationState,
  setGridSelectionState,
  addGridSelection,
  removeGridSelection,
  clearGridSelection,
  setGridExpandedRowsState,
  toggleGridExpandedRow,
  setViewBilledUsage,
  setInitialColumnWidth,
  
  // Grid status actions
  setGridLoadingState,
  setGridErrorState,
  
  // Utility actions
  clearGridState,
  resetGridData
} = gridSlice.actions;

export default gridSlice.reducer;
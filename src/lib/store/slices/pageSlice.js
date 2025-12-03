// src/lib/store/slices/pageSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Account Search
  switchAccountWindowState: false,
  notificationState: false,
  accountShowSearchResultState: false,
  accountSearchResultState: [],
  accountColumnWidthSetState: false,
  accountSearchSortState: [],
  accountSearchFilterState: null,
  accountCustomerState: null,

  // Cloud Commerce Dashlet
  selectedDateState: [],
  dashboardTotalState: [],

  // Active Subs Dashlet
  activeSubsGridState: [],
  activeSubsSortState: [],

  // Billable Items
  billableItemsTrendChartState: [],
  billableItemsGridState: [],
  billableItemsSortState: [],

  // Invoice Credit State
  invoiceCreditState: null,

  // Internationalization
  intlLocalProvider: 'en-US',

  // Other common page states
  selectedMonthState: '',
  defaultMonthState: [],
  selectedPagination: '',
  summaryTenantID: [],
  selectedTenantID: false,
  selectedTenantIDValue: '',
  subscriptionStatusValue: '',
  filterQuery: [],
  tabChangeState: false,
  scheduleDownloadState: false,
  downloadPopupVisibilityState: false,
  scheduleDownloadFileDetailState: '',
  resellerState: false,
  spendTrendState: '',
  
  // Loading States
  initialLoadingState: false,
  detailLoadingState: false,
  plainLoadingState: false,
  tabLoadingState: false,
  
  // Error States
  errorState: false,
  errorMessageState: '',

  // Location and Navigation
  breadcrumbState: false,
  locationObjectState: {},
  fileNameState: '',
  loginAsState: false,
  monthlyDifferenceState: false,
  
  // Custom Tags
  customTagsState: false,
  updatedCustomTagsState: false,
  customTagsObjectState: [],
  usageDataTagsObjectState: [],
  selectedTagsObjectState: [],
  selectedTagsState: [],
  selectedTagsStateString: '',
  buttonDisabledState: true,
  tagsCloseState: false,
  
  // Usage and Dates
  usageMonthState: '',
  showNotifiedTextState: false,
  pageDataExistsState: false,
  isPageExistsErrorState: false,
  reportDownloadDatesState: [],
  reportDownloadDateState: '',
};

const pageSlice = createSlice({
  name: 'page',
  initialState,
  reducers: {
    // Account Search Actions
    setSwitchAccountWindowState: (state, action) => {
      state.switchAccountWindowState = action.payload;
    },
    setNotificationState: (state, action) => {
      state.notificationState = action.payload;
    },
    setAccountShowSearchResultState: (state, action) => {
      state.accountShowSearchResultState = action.payload;
    },
    setAccountSearchResultState: (state, action) => {
      state.accountSearchResultState = action.payload;
    },
    setAccountColumnWidthSetState: (state, action) => {
      state.accountColumnWidthSetState = action.payload;
    },
    setAccountSearchSortState: (state, action) => {
      state.accountSearchSortState = action.payload;
    },
    setAccountSearchFilterState: (state, action) => {
      state.accountSearchFilterState = action.payload;
    },
    setAccountCustomer: (state, action) => {
      state.accountCustomerState = action.payload;
    },

    // Cloud Commerce Dashlet Actions
    setSelectedDateState: (state, action) => {
      state.selectedDateState = action.payload;
    },
    setDashboardTotalState: (state, action) => {
      state.dashboardTotalState = action.payload;
    },

    // Active Subs Dashlet Actions
    setActiveSubsGridState: (state, action) => {
      state.activeSubsGridState = action.payload;
    },
    setActiveSubsSortState: (state, action) => {
      state.activeSubsSortState = action.payload;
    },

    // Billable Items Actions
    setBillableItemsTrendChartState: (state, action) => {
      state.billableItemsTrendChartState = action.payload;
    },
    setBillableItemsGridState: (state, action) => {
      state.billableItemsGridState = action.payload;
    },
    setBillableItemsSortState: (state, action) => {
      state.billableItemsSortState = action.payload;
    },

    // Invoice Credit Actions
    setInvoiceCreditState: (state, action) => {
      state.invoiceCreditState = action.payload;
    },

    // Internationalization Actions
    setIntlLocalProvider: (state, action) => {
      state.intlLocalProvider = action.payload;
    },

    // Other Actions
    setSelectedMonthState: (state, action) => {
      state.selectedMonthState = action.payload;
    },
    setDefaultMonthState: (state, action) => {
      state.defaultMonthState = action.payload;
    },
    setSelectedPagination: (state, action) => {
      state.selectedPagination = action.payload;
    },
    setSummaryTenantID: (state, action) => {
      state.summaryTenantID = action.payload;
    },
    setSelectedTenantID: (state, action) => {
      state.selectedTenantID = action.payload;
    },
    setSelectedTenantIDValue: (state, action) => {
      state.selectedTenantIDValue = action.payload;
    },
    setSubscriptionStatusValue: (state, action) => {
      state.subscriptionStatusValue = action.payload;
    },
    setFilterQuery: (state, action) => {
      state.filterQuery = action.payload;
    },
    setTabChangeState: (state, action) => {
      state.tabChangeState = action.payload;
    },
    setScheduleDownloadState: (state, action) => {
      state.scheduleDownloadState = action.payload;
    },
    setDownloadPopupVisibilityState: (state, action) => {
      state.downloadPopupVisibilityState = action.payload;
    },
    setScheduleDownloadFileDetailState: (state, action) => {
      state.scheduleDownloadFileDetailState = action.payload;
    },
    setResellerState: (state, action) => {
      state.resellerState = action.payload;
    },
    setSpendTrendState: (state, action) => {
      state.spendTrendState = action.payload;
    },

    // Loading State Actions
    setInitialLoadingState: (state, action) => {
      state.initialLoadingState = action.payload;
    },
    setDetailLoadingState: (state, action) => {
      state.detailLoadingState = action.payload;
    },
    setPlainLoadingState: (state, action) => {
      state.plainLoadingState = action.payload;
    },
    setTabLoadingState: (state, action) => {
      state.tabLoadingState = action.payload;
    },

    // Error State Actions
    setErrorState: (state, action) => {
      state.errorState = action.payload;
    },
    setErrorMessageState: (state, action) => {
      state.errorMessageState = action.payload;
    },

    // Location and Navigation Actions
    setBreadcrumbState: (state, action) => {
      state.breadcrumbState = action.payload;
    },
    setLocationObjectState: (state, action) => {
      state.locationObjectState = action.payload;
    },
    setFileNameState: (state, action) => {
      state.fileNameState = action.payload;
    },
    setLoginAsState: (state, action) => {
      state.loginAsState = action.payload;
    },
    setMonthlyDifferenceState: (state, action) => {
      state.monthlyDifferenceState = action.payload;
    },

    // Custom Tags Actions
    setCustomTagsState: (state, action) => {
      state.customTagsState = action.payload;
    },
    setUpdatedCustomTagsState: (state, action) => {
      state.updatedCustomTagsState = action.payload;
    },
    setCustomTagsObjectState: (state, action) => {
      state.customTagsObjectState = action.payload;
    },
    setUsageDataTagsObjectState: (state, action) => {
      state.usageDataTagsObjectState = action.payload;
    },
    setSelectedTagsObjectState: (state, action) => {
      state.selectedTagsObjectState = action.payload;
    },
    setSelectedTagsState: (state, action) => {
      state.selectedTagsState = action.payload;
    },
    setSelectedTagsStateString: (state, action) => {
      state.selectedTagsStateString = action.payload;
    },
    setButtonDisabledState: (state, action) => {
      state.buttonDisabledState = action.payload;
    },
    setTagsCloseState: (state, action) => {
      state.tagsCloseState = action.payload;
    },

    // Usage and Date Actions
    setUsageMonthState: (state, action) => {
      state.usageMonthState = action.payload;
    },
    setShowNotifiedTextState: (state, action) => {
      state.showNotifiedTextState = action.payload;
    },
    setPageDataExistsState: (state, action) => {
      state.pageDataExistsState = action.payload;
    },
    setIsPageExistsErrorState: (state, action) => {
      state.isPageExistsErrorState = action.payload;
    },
    setReportDownloadDatesState: (state, action) => {
      state.reportDownloadDatesState = action.payload;
    },
    setReportDownloadDateState: (state, action) => {
      state.reportDownloadDateState = action.payload;
    },

    // Clear all page state (utility action)
    clearPageState: (state) => {
      return initialState;
    }
  },
});

export const {
  // Account Search Actions
  setSwitchAccountWindowState,
  setNotificationState,
  setAccountShowSearchResultState,
  setAccountSearchResultState,
  setAccountColumnWidthSetState,
  setAccountSearchSortState,
  setAccountSearchFilterState,
  setAccountCustomer,

  // Cloud Commerce Dashlet Actions
  setSelectedDateState,
  setDashboardTotalState,

  // Active Subs Dashlet Actions
  setActiveSubsGridState,
  setActiveSubsSortState,

  // Billable Items Actions
  setBillableItemsTrendChartState,
  setBillableItemsGridState,
  setBillableItemsSortState,

  // Invoice Credit Actions
  setInvoiceCreditState,

  // Internationalization Actions
  setIntlLocalProvider,

  // Other Actions
  setSelectedMonthState,
  setDefaultMonthState,
  setSelectedPagination,
  setSummaryTenantID,
  setSelectedTenantID,
  setSelectedTenantIDValue,
  setSubscriptionStatusValue,
  setFilterQuery,
  setTabChangeState,
  setScheduleDownloadState,
  setDownloadPopupVisibilityState,
  setScheduleDownloadFileDetailState,
  setResellerState,
  setSpendTrendState,

  // Loading State Actions
  setInitialLoadingState,
  setDetailLoadingState,
  setPlainLoadingState,
  setTabLoadingState,

  // Error State Actions
  setErrorState,
  setErrorMessageState,

  // Location and Navigation Actions
  setBreadcrumbState,
  setLocationObjectState,
  setFileNameState,
  setLoginAsState,
  setMonthlyDifferenceState,

  // Custom Tags Actions
  setCustomTagsState,
  setUpdatedCustomTagsState,
  setCustomTagsObjectState,
  setUsageDataTagsObjectState,
  setSelectedTagsObjectState,
  setSelectedTagsState,
  setSelectedTagsStateString,
  setButtonDisabledState,
  setTagsCloseState,

  // Usage and Date Actions
  setUsageMonthState,
  setShowNotifiedTextState,
  setPageDataExistsState,
  setIsPageExistsErrorState,
  setReportDownloadDatesState,
  setReportDownloadDateState,

  // Utility Actions
  clearPageState
} = pageSlice.actions;

export default pageSlice.reducer;
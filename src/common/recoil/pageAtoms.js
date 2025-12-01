import { atom } from 'recoil';
import { localStorageEffect, sessionStorageEffect } from './atomStorage';

/*Account Search*/

//account switch
const switchAccountWindowState  = atom ({
    key: 'switchAccountWindowState',
    default: false,
    effects: [
      sessionStorageEffect('account_window_open')
    ]
  });

//Notification
const notificationState  = atom ({
  key: 'notificationState',
  default: false,
});

//showSearchResultsState
const accountShowSearchResultState = atom ({
  key: 'accountShowSearchResultState',
  default: false,
  effects: [
    sessionStorageEffect('account_search_results')
  ]
});

//searchResultsState
const accountSearchResultState = atom ({
  key: 'accountSearchResultState',
  default: []
});

//column width set
const accountColumnWidthSetState = atom ({
  key: 'accountColumnWidthSetState',
  default: false  
});

const accountSearchSortState = atom({
  key: 'accountSearchSortState',
  default: [],
});

const accountSearchFilterState = atom({
  key: 'accountSearchFilterState',
  default: null,
});


/*End Account Search*/

/*Cloud Commerce Dashlet  */
const selectedDateState = atom ({
  key: 'selectedDateState',
  default: []
});

const dashboardTotalState = atom ({
  key: "dashboardTotalState",
  default: []
})


/*END Cloud Commerce Dashlet  */

/*Active Subs Dashlet*/

//searchResultsState
//grid data
const activeSubsGridState = atom ({
  key: 'activeSubsGridState',
  default: []
});

//grid sort
const activeSubsSortState = atom({
  key: 'activeSubsSortState',
  default: [],
});

/*End Active Subs Dashlet*/

/*Billable Items*/
//chart data
const billableItemsTrendChartState = atom ({
  key: 'billableItemsTrendChartState',
  default: []
});

const billableItemsGridState = atom ({
  key: 'billableItemsGridState',
  default: []
});

//grid sort
const billableItemsSortState = atom({
  key: 'billableItemsSortState',
  default: [],
});

const dailyConsumptionGridState = atom ({
  key: 'dailyConsumptionGridState',
  default: []
});

//Consumption Month State
const consumptionMonthState = atom ({
  key: 'consumptionMonthState',
  default: []
});

//Consumption customer selection 
const consumptionCustomer = atom({
  key: 'consumptionCustomer',
  default: [],
});

//grid sort
const dailyConsumptionSortState = atom({
  key: 'dailyConsumptionSortState',
  default: [],
});

const azureInvoiceGridState = atom ({
  key: 'azureInvoiceGridState',
  default: []
});

//grid sort
const azureInvoiceSortState = atom({
  key: 'azureInvoiceSortState',
  default: [],
});

const entitlementSummaryGridState = atom ({
  key: 'entitlementSummaryGridState',
  default: []
});

//grid sort
const entitlementSummarySortState = atom({
  key: 'entitlementSummarySortState',
  default: [],
});

//subscriptions sort
const subscriptionsSortState = atom({
  key: 'subscriptionsSortState',
  default: [],
});

const mpsaLicenseSortState = atom({
  key: 'mpsaLicenseSortState',
  default: [],
});

//grid data
const subscriptionsGridState = atom({
  key: 'subscriptionsGridState',
  default: [],
});

//active only
const subscriptionsActiveOnlyState = atom({
  key: 'subscriptionsActiveOnlyState',
  default: "Active",
});

//subscriptions Totals
const subscriptionsTotal = atom({
  key: 'subscriptionsTotal',
  default: [],
});

//subscriptions Totals
const subscriptionsStatus = atom({
  key: 'subscriptionsStatus',
  default: [],
});

// customer selection 
const accountCustomer = atom({
  key: 'accountCustomer',
  default: '',
});

//subscription Status selection 
const subscriptionSelectionStatus = atom({
  key: 'subscriptionSelectionStatus',
  default: [],
});

//errors 
const errorState = atom({
  key: 'errorState',
  default: false,
});

const errorMessageState = atom({
  key: 'errorMessageState',
  default: "",
});

//Loading States
const initialLoadingState = atom({
  key: 'initialLoadingState',
  default: true,
});

const monthLoadingState = atom({
  key: 'monthLoadingState',
  default: true,
});

const statusLoadingState = atom({
  key: 'statusLoadingState',
  default: false,
});

const customerLoadingState = atom({
  key: 'customerLoadingState',
  default: false,
});

const customLoadingState = atom({
  key: 'customLoadingState',
  default: false,
});

const chartTypeLoadingState = atom({
  key: 'chartTypeLoadingState',
  default: false,
});

const topNExpensiveProductsChartTypeLoadingState = atom({
  key: 'topNExpensiveProductsChartTypeState',
  default: false,
});

const chartLoadingState = atom({
  key: 'chartLoadingState',
  default: false,
});

const detailLoadingState = atom({
  key: 'detailLoadingState',
  default: false,
});

const consumptionHeaderLoadingState = atom({
  key: 'consumptionHeaderLoadingState',
  default: true,
});

const plainLoadingState = atom({
  key: 'plainLoadingState',
  default: false,
});

const tabLoadingState = atom({
  key: 'tabLoadingState',
  default: false,
});

const switchAccountState = atom({
  key: 'switchAccountState',
  default: false,
});

const loginAsAccountState = atom({
  key: 'loginAsAccountState',
  default: false,
});

const selectedMonthState = atom({
  key: 'selectedMonthState',
  default: "",
});

const defaultMonthState = atom({
  key: 'defaultMonthState',
  default: [],
});

const selectedPagination = atom({
  key: 'selectedPagination',
  default: "",
});

//intl Local Provider
const intlLocalProvider = atom({
  key: 'intlLocalProvider',
  default: "en-US",
});

//Subscription Tenant ID's
const summaryTenantID = atom({
  key: 'summaryTenantID',
  default: [],
});

//Subscription Tenant ID's
const selectedTenantID = atom({
  key: 'selectedTenantID',
  default: false,
});

//Subscription Tenant ID's Value
const selectedTenantIDValue = atom({
  key: 'selectedTenantIDValue',
  default: "",
});

const subscriptionStatusValue = atom({
  key: 'subscriptionStatusValue',
  default: "",
});

//Filter Query
const filterQuery = atom({
  key: 'filterQuery',
  default: [],
});

const tabChangeState = atom({
  key: "tabChangeState",
  default: false,
});

//Schedule Download
const scheduleDownloadState = atom({
  key: 'scheduleDownloadState',
  default: false,
});

//Download Popup Visibility State
const downloadPopupVisibilityState = atom({
  key: 'downloadPopupVisibilityState',
  default: false,
});

//Schedule Download File Details
const scheduleDownloadFileDetailState = atom({
  key: 'scheduleDownloadFileDetailState',
  default: '',
});

//Reseller Availibility
const resellerState = atom({
  key: 'resellerState',
  default: false,
});

//Azure spend by customer
const spendTrendState = atom({
  key: 'spendTrendState',
  default: '',
});

//InvoicecRedit
const invoiceCreditState = atom({
  key: 'invoiceCreditState',
  default: '',
});

//Redirect from Invoice
const breadcrumbState = atom({
  key: 'breadcrumbState',
  default: false,
});

const locationObjectState = atom({
  key: 'locationObjectState',
  default: {},
  effects: [
    sessionStorageEffect('location_state')
  ]
});

const fileNameState = atom({
  key: 'fileNameState',
  default: '',
});

const loginAsState = atom({
  key: 'loginAsState',
  default: false,
});

const monthlyDifferenceState = atom({
  key: 'monthlyDifferenceState',
  default: false,
});

const customTagsState = atom({
  key: 'customTagsState',
  default: false,
});

const updatedCustomTagsState = atom({
  key: 'updatedCustomTagsState',
  default: false,
});

const customTagsObjectState = atom({
  key: 'customTagsObjectState',
  default: [],
});
const usageDataTagsObjectState = atom({
  key: 'usageDataTagsObjectState',
  default: [],
});

const selectedTagsObjectState = atom({
  key: 'selectedTagsObjectState',
  default: [],
});

const selectedTagsStateString = atom({
  key: 'selectedTagsStateString',
  default: '',
});

const buttonDisabledState = atom({
  key: 'buttonDisabledState',
  default: true,
});

const tagsCloseState = atom({
  key: 'tagsCloseState',
  default: false,
});

const selectedTagsState = atom({
  key: 'selectedTagsState',
  default: [],
});

const usageMonthState = atom({
  key: 'usageMonthState',
  default: '',
});

const showNotifiedTextState = atom({
  key: 'showNotifiedTextState',
  default: false,
});

const pageDataExistsState = atom({
  key: 'pageDataExistsState',
  default: false,
});

const isPageExistsErrorState = atom({
  key: 'isPageExistsErrorState',
  default: false,
});

const reportDownloadDatesState = atom({
  key: 'reportDownloadDatesState',
  default: [],
});

const reportDownloadDateState = atom({
  key: 'reportDownloadDateState',
  default: '',
});

const reportDownloadNoDateState = atom({
  key: 'reportDownloadNoDateState',
  default: '',
});

const tagLimitState = atom({
  key: 'tagLimitState',
  default: false,
  effects: [
    sessionStorageEffect('tag_limit')
  ]
});

const tagLimitSize = atom({
  key: 'tagLimitSize',
  default: 0,
  effects: [
    sessionStorageEffect('tag_limit_size')
  ]
});

const mpsaState = atom({
  key: 'mpsaState',
  default: false,
  effects: [
    sessionStorageEffect('mpsa_state')
  ]
});

const hasReservedInstanceorAzureSavingsPlanState = atom({
  key: 'hasReservedInstanceorAzureSavingsPlanState',
  default: false,
  effects: [
    sessionStorageEffect('has_reserved_instance_or_azure_savings_plan')
  ]
});

const hasAzureSpendWidgetDataState = atom({
  key: 'hasAzureSpendWidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_azure_spend_widget_data')
  ]
});

const hasM365WidgetDataState = atom({
  key: 'hasM365WidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_m365_widget_data')
  ]
});

const hasMPSAWidgetDataState = atom({
  key: 'hasMPSAWidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_mpsa_widget_data')
  ]
});

const hasAdobeWidgetDataState = atom({
  key: 'hasAdobeWidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_adobe_widget_data')
  ]
});

const hasMSSpendWidgetDataState = atom({
  key: 'hasMSSpendWidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_msspend_widget_data')
  ]
});

const salesOrganizationCountryCode = atom({
  key: 'salesOrganizationCountryCode',
  default: false,
  effects: [
    localStorageEffect('sales_organization_country_code')
  ]
});

const hasAwsSpendWidgetDataState = atom({
  key: 'hasAwsSpendWidgetDataState',
  default: false,
  effects: [
    localStorageEffect('has_aws_spend_widget_data')
  ]
});

const hasAwsConsumptionDataState = atom({
  key: 'hasAwsConsumptionDataState',
  default: false,
  effects: [
    localStorageEffect('has_aws_consumption_data')
  ]
});

const widgetFlagsReadyState = atom({
  key: 'widgetFlagsReadyState',
  default: false,
});

const trendSelectedPeriodState = atom({
  key: 'trendSelectedPeriodState',
  default: "",
});

const trendSelectedState = atom({
  key: 'trendSelectedState',
  default: false,
});

//Provider States
const initialProviderState = atom({
  key: 'initialProviderState',
  default: null,
});

const providerState = atom({
  key: 'providerState',
  default: [],
});

const selectedProviderState = atom({
  key: 'selectedProviderState',
  default: [],
});

const selectedStartDateState = atom({
  key: 'selectedStartDateState',
  default: null,
});

const selectedEndDateState = atom({
  key: 'selectedEndDateState',
  default: null,
});

const selectedInitialInvoiceMonthState = atom({
  key: 'selectedInitialInvoiceMonthState',
  default: null,
});

//return
export {
  accountSearchResultState, 
  switchAccountWindowState,
  notificationState,
  accountShowSearchResultState,
  accountSearchSortState,
  accountSearchFilterState,
  accountColumnWidthSetState,
  activeSubsGridState,
  activeSubsSortState,
  selectedDateState,
  dashboardTotalState,
  billableItemsTrendChartState,
  billableItemsGridState,
  billableItemsSortState,
  dailyConsumptionGridState,
  consumptionMonthState,
  consumptionCustomer,
  dailyConsumptionSortState,
  azureInvoiceGridState,
  azureInvoiceSortState,
  entitlementSummaryGridState,
  entitlementSummarySortState,
  subscriptionsActiveOnlyState,
  subscriptionsGridState,
  subscriptionsSortState,
  mpsaLicenseSortState,
  subscriptionsTotal,
  subscriptionsStatus,
  accountCustomer,
  subscriptionSelectionStatus,
  errorMessageState,
  errorState,
  initialLoadingState,
  monthLoadingState,
  statusLoadingState,
  customerLoadingState,
  customLoadingState,
  chartTypeLoadingState,
  topNExpensiveProductsChartTypeLoadingState,
  chartLoadingState,
  detailLoadingState,
  consumptionHeaderLoadingState,
  plainLoadingState,
  tabLoadingState,
  switchAccountState,
  selectedMonthState,
  defaultMonthState,
  selectedPagination,
  intlLocalProvider,
  summaryTenantID,
  selectedTenantID,
  selectedTenantIDValue,
  subscriptionStatusValue,
  filterQuery,
  tabChangeState,
  scheduleDownloadState,
  downloadPopupVisibilityState,
  resellerState,
  scheduleDownloadFileDetailState,
  spendTrendState,
  invoiceCreditState,
  breadcrumbState,
  locationObjectState,
  fileNameState,
  loginAsState,
  monthlyDifferenceState,
  customTagsState,
  updatedCustomTagsState,
  customTagsObjectState,
  loginAsAccountState,
  usageDataTagsObjectState,
  selectedTagsObjectState,
  buttonDisabledState,
  tagsCloseState,
  selectedTagsState,
  usageMonthState,
  showNotifiedTextState,
  selectedTagsStateString,
  pageDataExistsState,
  isPageExistsErrorState,
  reportDownloadDatesState,
  reportDownloadDateState,
  reportDownloadNoDateState,
  tagLimitState,
  tagLimitSize,
  mpsaState,
  hasReservedInstanceorAzureSavingsPlanState,
  hasAzureSpendWidgetDataState,
  hasM365WidgetDataState,
  hasMPSAWidgetDataState,
  hasAdobeWidgetDataState,
  hasMSSpendWidgetDataState,
  salesOrganizationCountryCode,
  hasAwsSpendWidgetDataState,
  hasAwsConsumptionDataState,
  widgetFlagsReadyState,
  trendSelectedPeriodState,
  trendSelectedState,
  initialProviderState,
  providerState,
  selectedProviderState,
  selectedStartDateState,
  selectedEndDateState,
  selectedInitialInvoiceMonthState
}
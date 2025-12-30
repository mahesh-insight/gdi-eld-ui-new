// src/store/dashboardSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mpsaStatusData: null,
  widgetFlags: {
    isAzureSpendWidgetDataState: false,
    isM365WidgetDataState: false,
    isMSSpendWidgetDataState: false,
    isAwsSpendWidgetDataState: false,
    isAdobeWidgetDataState: false,
    isMPSAWidgetDataState: false,
    hasReservedInstanceOrAzureSavingsPlan: false,
    unlimitedCspTags: false,
    hasConsumptionData: false,
  },
  salesOrganizationCountryCode: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setMpsaStatusData: (state, action) => {
      const payload = action?.payload;
      
      if (!payload || typeof payload !== 'object') {
        console.warn('⚠️ setMpsaStatusData called with invalid payload:', payload);
        return state;
      }

      // Store only serializable data (data, status, statusText)
      // Do NOT store headers, config, request, or other non-serializable Axios properties
      state.mpsaStatusData = {
        data: payload.data || null,
        status: payload.status || null,
        statusText: payload.statusText || ''
      };

      // Extract and store widget flags
      if (payload.data) {
        const { microsoft, aws, adobe, salesOrganizationCountryCode } = payload.data;

        // Microsoft flags
        if (microsoft) {
          state.widgetFlags.isAzureSpendWidgetDataState = microsoft.hasAzureSpendWidgetData ?? false;
          state.widgetFlags.isM365WidgetDataState = microsoft.hasM365WidgetData ?? false;
          state.widgetFlags.isMSSpendWidgetDataState = microsoft.hasMSSpendWidgetData ?? false;
          state.widgetFlags.isMPSAWidgetDataState = microsoft.haveMPSAData ?? false;
          state.widgetFlags.hasReservedInstanceOrAzureSavingsPlan = microsoft.hasReservedInstanceOrAzureSavingsPlan ?? false;
          state.widgetFlags.unlimitedCspTags = microsoft.unlimitedCspTags ?? false;
        }

        // AWS flags
        if (aws) {
          state.widgetFlags.isAwsSpendWidgetDataState = aws.hasSpendWidgetData ?? false;
          state.widgetFlags.hasConsumptionData = aws.hasConsumptionData ?? false;
        }

        // Adobe flags
        if (adobe) {
          state.widgetFlags.isAdobeWidgetDataState = adobe.hasSpendWidgetData ?? false;
        }

        // Country code
        state.salesOrganizationCountryCode = salesOrganizationCountryCode || null;
      }

      console.log('✅ Dashboard widget flags updated:', state.widgetFlags);
    },
    clearDashboardData: (state) => {
      return initialState;
    },
  },
});

export const { setMpsaStatusData, clearDashboardData } = dashboardSlice.actions;
export default dashboardSlice.reducer;

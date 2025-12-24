// src/lib/utils/mpsaUtils.js

/**
 * Parse MPSA context data and extract widget visibility flags
 * @param {Object} contextData - The MPSA context response data
 * @returns {Object} Widget visibility flags
 */
export const parseMpsaWidgetFlags = (contextData) => {
  // Default flags - all false
  const defaultFlags = {
    hasAzureSpendWidgetData: false,
    hasM365WidgetData: false,
    hasMSSpendWidgetData: false,
    hasAwsSpendWidgetData: false,
    hasAdobeWidgetData: false,
    haveMPSAData: false
  };

  // If no context data, return default flags
  if (!contextData?.data) {
    console.log('⚠️ No MPSA context data available, using default flags');
    return defaultFlags;
  }

  const mpsaData = contextData.data;
  console.log('🔍 Parsing MPSA widget flags from:', mpsaData);

  try {
    return {
      // Azure Spend Widget - based on microsoft.hasAzureSpendWidgetData
      hasAzureSpendWidgetData: Boolean(mpsaData?.microsoft?.hasAzureSpendWidgetData),
      
      // M365 Widget - based on microsoft.hasM365WidgetData  
      hasM365WidgetData: Boolean(mpsaData?.microsoft?.hasM365WidgetData),
      
      // MS Spend Widget - based on microsoft.hasMSSpendWidgetData
      hasMSSpendWidgetData: Boolean(mpsaData?.microsoft?.hasMSSpendWidgetData),
      
      // AWS Widget - based on aws.hasSpendWidgetData
      hasAwsSpendWidgetData: Boolean(mpsaData?.aws?.hasSpendWidgetData),
      
      // Adobe Widget - based on adobe.hasSpendWidgetData
      hasAdobeWidgetData: Boolean(mpsaData?.adobe?.hasSpendWidgetData),
      
      // MPSA Widget - based on microsoft.haveMPSAData
      haveMPSAData: Boolean(mpsaData?.microsoft?.haveMPSAData)
    };
  } catch (error) {
    console.error('❌ Error parsing MPSA widget flags:', error);
    return defaultFlags;
  }
};

/**
 * Get additional MPSA context information
 * @param {Object} contextData - The MPSA context response data
 * @returns {Object} Additional context information
 */
export const getMpsaContextInfo = (contextData) => {
  if (!contextData?.data) return {};

  const mpsaData = contextData.data;
  
  return {
    soldToId: mpsaData?.soldToId || null,
    salesOrganizationCountryCode: mpsaData?.salesOrganizationCountryCode || null,
    unlimitedCspTags: Boolean(mpsaData?.microsoft?.unlimitedCspTags),
    hasReservedInstanceOrAzureSavingsPlan: Boolean(mpsaData?.microsoft?.hasReservedInstanceOrAzureSavingsPlan),
    hasAwsConsumptionData: Boolean(mpsaData?.aws?.hasConsumptionData),
    haveMPSAData: Boolean(mpsaData?.microsoft?.haveMPSAData)
  };
};
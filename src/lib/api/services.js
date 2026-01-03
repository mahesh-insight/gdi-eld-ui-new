/*
 * services.js
 * @project:    ELD
 * @date:       2023-09-21
 * @author:     Mahesh
 */

/**
 * Environment-based configuration
 */
const getEnvironmentConfig = () => {
  console.log('🔍 Environment Detection:', {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_CCR_API_BASE_URL: process.env.NEXT_PUBLIC_CCR_API_BASE_URL,
    CCR_API_BASE_URL: process.env.CCR_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV
  });
  
  // Check for explicit environment variables first
  if (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL) {
    const result = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
    console.log('🎯 Using explicit env var base URL:', result);
    return result;
  }

  // Fallback to CCR-specific environment variables
  if (
    process.env.NEXT_PUBLIC_CCR_API_BASE_URL ||
    process.env.CCR_API_BASE_URL
  ) {
    return (
      process.env.NEXT_PUBLIC_CCR_API_BASE_URL || process.env.CCR_API_BASE_URL
    );
  }

  // Use dedicated APP_ENV or DEPLOY_ENV for environment detection
  const appEnv =
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    process.env.NEXT_PUBLIC_DEPLOY_ENV ||
    process.env.DEPLOY_ENV ||
    process.env.NEXT_PUBLIC_ENV ||
    process.env.ENV;

  // Check for localhost indicators (local development)
  const isLocal =
    !appEnv ||
    appEnv === "local" ||
    (typeof window !== "undefined" &&
      window.location.hostname === "localhost") ||
    (typeof window === "undefined" &&
      !process.env.NEXT_PUBLIC_API_BASE_URL &&
      !process.env.API_BASE_URL);

  if (isLocal) {
    console.log('🎯 Using local development base URL: http://localhost:8080');
    return "http://localhost:8080"; // Backend server port for local development
  }

  // Environment-based defaults using APP_ENV
  switch (appEnv?.toLowerCase()) {
    case "dev":
    case "development":
      return "https://api-ccrdev.insight.com";
    case "qa":
    case "staging":
      return "https://ccrqa.insight.com";
    case "prod":
    case "production":
      return "https://api-ccr.insight.com";
    default:
      // Fallback based on NODE_ENV only if no APP_ENV is set
      return process.env.NODE_ENV === "production"
        ? "https://api-ccr.insight.com"
        : "http://localhost";
  }
};

/**
 * Common configuration shared across all services
 */
const commonConfig = {
  baseURL: getEnvironmentConfig(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 600000,
};

/**
 * Service configuration for API endpoints
 */
const services = {
  loginAuthCode: {
    url: "/ccr-login-service/signin/authcode",
    noAuthHeader: true, // Don't add auth header for login requests
  },
  mpsaStatus: {
    method: "GET",
    url: `/ccr-dashboard-service/context`,
    pathParam: true,
  },
  // Dashboard widgets
  getAzureSpendWidget:{
    method: 'POST',
    url: '/ccr-dashboard-service/microsoft/azurespend'
  },
  getAwsSpendWidget:{
    method: 'POST',
    url: '/ccr-dashboard-service/aws/billableitem'
  },
  getMSCloudWidget:{
    method: 'POST',
    url: '/ccr-dashboard-service/microsoft/mscloud'
  },
  getM365Widget:{
    method: 'POST',
    url: '/ccr-dashboard-service/microsoft/m365'
  },
  getAdobeSpendWidget:{
    method: 'POST',
    url: '/ccr-dashboard-service/adobe/billableitem'
  },
  getMPSAWidget:{
    method: 'POST',
    url: '/ccr-dashboard-service/microsoft/mpsa'
  },
  // Invoice services - properly configured for centralized API management
  invoiceMonths: {
    method: "POST",
    url: "/ccr-invoice-service/months",
  },
  invoiceSummary: {
    method: "POST",
    url: "/ccr-invoice-service/summary",
    urlParam: true, // Indicates this service accepts URL parameters
  },
  invoiceMonthDetail: {
    method: "POST",
    url: "/ccr-invoice-service/month",
    urlParam: true,
  },
  invoiceMonthlyDifferenceDetail: {
    method: "POST",
    url: "/ccr-invoice-service/month/sku-difference",
    urlParam: true,
  },
  invoiceTrend: {
    method: "POST", 
    url: "/ccr-invoice-service/trend",
    urlParam: true,
  },
  invoiceCredits: {
    method: "POST",
    url: "/ccr-invoice-service/total",
    urlParam: true,
  },

  // Billable Items
  providers: {
    method: 'POST',
    url: `/ccr-billableitem-service/provider`
  },
  microsoftBillableInvoiceMonths: {
    method: 'POST',
    url: `/ccr-billableitem-service/microsoft/months`
  },
  microsoftBillableInvoiceSummary: {
    method: 'POST',
    url: `/ccr-billableitem-service/microsoft/summary/{{urlParam}}`,
    urlParam: true
  },
  microsoftBillableInvoiceMonthDetail: {
    method: 'POST',
    url: `/ccr-billableitem-service/microsoft/month/{{urlParam}}`,
    urlParam: true
  },
  microsoftBillableInvoiceTrend: {
    method: 'POST',
    url: `/ccr-billableitem-service/microsoft/trend`
  },

  // AWS Billable Items
  awsBillableInvoiceMonths: {
    method: 'POST',
    url: `/ccr-billableitem-service/aws/months`
  },
  awsBillableInvoiceSummary: {
    method: 'POST',
    url: `/ccr-billableitem-service/aws/summary/{{urlParam}}`,
    urlParam: true
  },
  awsBillableInvoiceMonthDetail: {
    method: 'POST',
    url: `/ccr-billableitem-service/aws/month/{{urlParam}}`,
    urlParam: true
  },
  awsBillableInvoiceTrend: {
    method: 'POST',
    url: `/ccr-billableitem-service/aws/trend`
  },

  // Adobe Billable Items
  adobeBillableInvoiceMonths: {
    method: 'POST',
    url: `/ccr-billableitem-service/adobe/months`
  },
  adobeBillableInvoiceSummary: {
    method: 'POST',
    url: `/ccr-billableitem-service/adobe/summary/{{urlParam}}`,
    urlParam: true
  },
  adobeBillableInvoiceMonthDetail: {
    method: 'POST',
    url: `/ccr-billableitem-service/adobe/month/{{urlParam}}`,
    urlParam: true
  },
  adobeBillableInvoiceTrend: {
    method: 'POST',
    url: `/ccr-billableitem-service/adobe/trend`
  },

};

/**
 * Get service configuration by name
 * @param {string} serviceName - Name of the service
 * @param {string} customBaseURL - Custom base URL override
 * @returns {object} Service configuration
 */
const getService = (serviceName, customBaseURL) => {
  const service = services[serviceName];
  if (!service) {
    throw new Error(`Service '${serviceName}' not found`);
  }

  // Merge common config with service-specific config
  return {
    ...commonConfig,
    ...service,
    baseURL: customBaseURL || commonConfig.baseURL,
    headers: {
      ...commonConfig.headers,
      ...(service.headers || {}),
    },
  };
};

const servicesExport = {
  getService,
  services,
};

export default servicesExport;
export { getService, services };

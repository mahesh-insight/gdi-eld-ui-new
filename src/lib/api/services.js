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
  // Check for explicit environment variables first
  if (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
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
    pathParam: true, // Indicates this service accepts path parameters
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

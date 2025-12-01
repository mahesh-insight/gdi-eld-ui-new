/*
 * services.js
 * @project:    ELD
 * @date:       2023-09-21
 * @author:     Mahesh
 */

/**
 * Service configuration for API endpoints
 */
const services = {
  loginAuthCode: {
    baseURL: process.env.NEXT_PUBLIC_CCR_API_BASE_URL || process.env.CCR_API_BASE_URL || 'http://localhost',
    url: '/ccr-login-service/signin/authcode', 
    headers: {
      'Content-Type': 'application/json',
    },
    noAuthHeader: true, // Don't add auth header for login requests
  },
  // Add more service configurations as needed
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
  
  return {
    ...service,
    baseURL: customBaseURL || service.baseURL,
  };
};

const servicesExport = {
  getService,
  services,
};

export default servicesExport;
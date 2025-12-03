/*  This javascript code responsilbe for the axios methods 
get, post, put, delete & patch */

/*
 * request.js
 * @project:    ELD
 * @date:       2023-09-21
 * @author:     Mahesh
 */

import axios from "axios";
import services from "./services";
import { parseISO } from "date-fns";

const defaultTimeout = 600000;
let defaultRetry = 1;

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Simple API response handler for server environments
 */
const getAPIResponse = async (response) => {
  const hasErrors = response?.data?.errors && response.data.errors.length > 0;
  
  return {
    hasErrors,
    statusCode: response?.status || 500,
    data: response?.data || {},
    headers: response?.headers || {},
  };
};

/**
 * This method will format the date response
 */
const isoDateFormat =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;

function isIsoDateString(value) {
  return value && typeof value === "string" && isoDateFormat?.test(value);
}

function getOffset(dateValue){
  var offsetMiliseconds = 0;
  if (dateValue.getUTCHours() == 23) {
    offsetMiliseconds = (dateValue.getTimezoneOffset() + 60);
  }
  else {
    offsetMiliseconds = dateValue.getTimezoneOffset();
  }
  return (offsetMiliseconds * 60000)
}

export function handleDates(response, visited = new WeakSet()) {
  if (
    response === null ||
    response === undefined ||
    typeof response !== "object"
  )
    return response;

  // Prevent infinite recursion on circular references
  if (visited.has(response)) {
    return response;
  }
  visited.add(response);

  for (const key of Object?.keys(response)) {
    const value = response[key];
    if (isIsoDateString(value)) {
      var newValue = parseISO(value);
      response[key] = new Date(parseInt(Date.UTC(newValue.getUTCFullYear(), newValue.getUTCMonth(), newValue.getUTCDate(),
          newValue.getUTCHours(), newValue.getUTCMinutes()) + getOffset(newValue)));
    }
    else if (typeof value === "object") handleDates(value, visited);
  }
}

/**
 * This method will create instane of axios
 * @param {String} serviceName name of service defined in services.js
 * @param {Object} configuration configuration object supported by axios
 * @returns {Object}
 */
const instance = (serviceName, configuration = {}) => {
  const uiProps = isBrowser ? JSON.parse(localStorage?.getItem('uiProps') || '{}') : {};
  
  // Get service configuration with environment-based baseURL
  let serviceConfig;
  
  // Check if this is truly local development (not deployed dev/qa)
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV || 
                 process.env.NEXT_PUBLIC_DEPLOY_ENV || process.env.DEPLOY_ENV ||
                 process.env.NEXT_PUBLIC_ENV || process.env.ENV;
  
  const isLocal = !appEnv || 
                  appEnv === 'local' || 
                  (isBrowser && window.location.hostname === 'localhost') ||
                  (!isBrowser && !process.env.NEXT_PUBLIC_API_BASE_URL && !process.env.API_BASE_URL);
  
  // For auth services in true local development, use localhost
  if (serviceName === 'loginAuthCode' && isLocal) {
    // Local development - use localhost for auth
    serviceConfig = services.getService(serviceName);
    serviceConfig.baseURL = 'http://localhost';
  } else {
    // Use environment-based configuration or uiProps override
    const customBaseURL = uiProps?.CCR_API_BASE_URL;
    serviceConfig = services.getService(serviceName, customBaseURL);
  }
  const { url = "", pathParam = "", urlParam = "", ...otherConfig } = configuration;
  
  // Build the complete URL from baseURL and service URL
  let serviceUrl = serviceConfig.url || '';
  
  // Handle path parameters for services that support them
  if (pathParam && serviceConfig.pathParam) {
    serviceUrl = `${serviceUrl}/${pathParam}`;
  }
  
  // Handle URL parameters for services that support them
  if (urlParam && serviceConfig.urlParam) {
    // If urlParam starts with '?', it's query parameters, don't add '/'
    // If it doesn't start with '?', it's a path segment, add '/'
    if (urlParam.startsWith('?')) {
      serviceUrl = `${serviceUrl}${urlParam}`;
    } else {
      serviceUrl = `${serviceUrl}/${urlParam}`;
    }
  }
  
  const finalBaseURL = serviceUrl 
    ? `${serviceConfig.baseURL}${serviceUrl}`
    : serviceConfig.baseURL;
  
  serviceConfig.baseURL = finalBaseURL;
   
  const config = Object.assign(
    {
      timeout: defaultTimeout,
      maxRedirects: 0,
    },
    serviceConfig,
    otherConfig
  );

  let xCorrelationID = {};

  config.params = { ...serviceConfig.params, ...otherConfig.params };
  config.headers = {
    ...xCorrelationID,
    ...config.headers,
    ...serviceConfig.headers,
  };

  const serviceInstance = axios.create(config);
  
  // Authorization request interceptor
  serviceInstance.interceptors.request.use(
    async function (config) {
      if (isBrowser) {
        // Check if this is an auth endpoint that doesn't need tokens
        if (config?.noAuthHeader || config.baseURL.includes("ccr-login-service")) {
          // No auth header needed
        } else {
          // Get token from Redux store
          let accessToken = null;
          
          try {
            // Get Redux store state from window if available
            if (window.__REDUX_STORE__) {
              const state = window.__REDUX_STORE__.getState();
              accessToken = state?.auth?.accessToken;
            }
          } catch (error) {
            // Fallback to localStorage if Redux store not available
            accessToken = localStorage.getItem("access_token");
          }
          
          // Add token if available
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        }
      } else {
        // Server-side: Don't set auth headers for auth endpoints
        if (!config?.noAuthHeader && !config.baseURL.includes("ccr-login-service")) {
          // For server-side requests that need auth, you can pass token in configuration
          if (configuration.accessToken) {
            config.headers.Authorization = `Bearer ${configuration.accessToken}`;
          }
        }
      }
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  // Authorization response interceptor
  serviceInstance.interceptors.response.use(
    async function (response) {
      const statusCodes = [403, 502, 504];
      const resp = await getAPIResponse(response);
      // error code check
      if (
        resp.hasErrors &&
        statusCodes.includes(resp.statusCode) &&
        !configuration.stopRetry
      ) {
        configuration.stopRetry = true;
        if (resp.data.errors[0]["code"] !== "ExternalOAuthFailed") {
          return instance(serviceName, configuration).request();
        } else {
          if (defaultRetry < 5) configuration.stopRetry = false;
          defaultRetry = defaultRetry + 1;
          return instance(serviceName, configuration).request();
        }
      }
      handleDates(response);

      if (
        resp.hasErrors &&
        resp?.data?.errors[0]["code"] !== "ExternalOAuthFailed"
      )
        throw response;
        
      return response;
    },
    async function (error) {
      // const errorCode = [401, 403, 502];
      const errorCode = [401];
      const { response } = error;

      if (
        response &&
        errorCode.includes(response.status) &&
        !configuration.stopRetry
      ) {
        if (isBrowser) {
          // Client-side: clear localStorage and redirect
          localStorage.removeItem("access_token");
          localStorage.removeItem("authenticationURL");
          localStorage.removeItem("logged_in");
          localStorage.removeItem("soldToId");
          localStorage.removeItem("user_data");
          localStorage.removeItem("account_selection");
          localStorage.removeItem("login_response");
          sessionStorage?.clear();
          window.location = '/';
        }
        configuration.stopRetry = true;
        return response;
      }
      return Promise.reject(error);
    }
  );

  if (serviceConfig?.interceptors) {
    Object.entries(serviceConfig?.interceptors)?.forEach((interceptor) => {
      if (typeof interceptor[1] === "function") {
        serviceInstance?.interceptors[interceptor[0]].use(interceptor[1]);
      } else if (typeof interceptor[1] === "object") {
        serviceInstance?.interceptors[interceptor[0]].use(
          interceptor[1]["success"],
          interceptor[1]["error"]
        );
      }
    });
  }
  return serviceInstance;
};

/**
 * This method will make get request using axios instance
 * @param {String} serviceName name of service defined in services.js
 * @param {Object} configuration list of configuration
 */
const get = async (serviceName, configuration = {}) => {
  const serviceInstance = instance(serviceName, configuration);
  const response = await serviceInstance
    .request()
    .then((res) => {
      return res;
    })
    .catch((e) => {
      // TODO: Implement error handler
      return e.response;
    });
  return response;
};

/**
 * This method will make post request using axios instance
 * @param {String} serviceName  name of service defined in services.js
 * @param {Object} param1 list of configuration
 */
const post = async (serviceName, { data, ...otherConfig } = {}) => {
  const config = Object.assign(
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
    },
    otherConfig
  );

  const serviceInstance = instance(serviceName, config);
  return await serviceInstance
    .request({ data })
    .then((res) => {
      if (res === undefined) {
        // TODO: Implement logger
      } else if (res?.data && res?.data?.errors) {
        // TODO: Implement logger
      }
      return res && res?.data;
    })
    .catch((error) => {
      console.error(error);
      // TODO: Implement logger
      throw error;
    });
};

/**
 * This method will make put request using axios instance
 * @param {String} serviceName  name of service defined in services.js
 * @param {Object} param1 list of configuration
 */
const put = async (serviceName, { data, ...otherConfig } = {}) => {
  const config = Object.assign(
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
    otherConfig
  );

  const serviceInstance = instance(serviceName, config);
  return await serviceInstance
    .request({ data })
    .then((res) => {
      if (res === undefined) {
        // TODO: Implement logger
      } else if (res.data && res.data.errors) {
        // TODO: Implement logger
      }
      return res && res.data;
    })
    .catch((error) => {
      // TODO: Implement logger
      // NOTE: Handle error here
    });
};

/**
 * This method will make delete request using axios instance
 * @param {String} serviceName  name of service defined in services.js
 * @param {Object} configuration list of configuration
 */
const del = async (serviceName, { data = {}, ...otherConfig } = {}) => {
  const config = Object.assign(
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "DELETE",
    },
    otherConfig
  );

  const serviceInstance = instance(serviceName, config);
  return await serviceInstance
    .request({ data })
    .then((res) => {
      if (res === undefined) {
        // TODO: Implement logger
      } else if (res.data && res.data.errors) {
        // TODO: Implement logger
      }
      return res && res.data;
    })
    .catch((error) => {
      // TODO: Implement logger
      throw error;
    });
};

/**
 * This method will make patch request using axios instance
 * @param {String} serviceName  name of service defined in services.js
 * @param {Object} param1 list of configuration
 */
const patch = async (serviceName, { data, ...otherConfig } = {}) => {
  const config = Object.assign(
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
    otherConfig
  );
  const serviceInstance = instance(serviceName, config);
  return await serviceInstance
    .request({ data })
    .then((res) => {
      if (res === undefined) {
        // TODO: Implement logger
      } else if (res.data && res.data.errors) {
        // TODO: Implement logger
      }
      return res && res.data;
    })
    .catch((error) => {
      // TODO: Implement logger
    });
};

const request = {
  instance,
  get,
  post,
  put,
  del,
  patch,
};

export default request;

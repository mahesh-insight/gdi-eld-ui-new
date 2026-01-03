// Get the API base URL for server-side calls
function getApiBaseUrl() {
  // Always use the API base URL from environment variables
  // This should NEVER use window.location.origin as we're calling external APIs
  
  // Log all environment variables for debugging
  console.log('🔍 Environment variables check:', {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_CCR_API_BASE_URL: process.env.NEXT_PUBLIC_CCR_API_BASE_URL,
    CCR_API_BASE_URL: process.env.CCR_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL
  });
  
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                 process.env.API_BASE_URL || 
                 process.env.NEXT_PUBLIC_CCR_API_BASE_URL ||
                 process.env.CCR_API_BASE_URL ||
                 'https://api-ccrdev.insight.com';
  
  console.log('🎯 Final API Base URL for server config:', apiUrl);
  return apiUrl;
}

const getUiPropertiesEndpoint = () => `${getApiBaseUrl()}/ccr-authentication-service/uiproperties`;

let cachedUiProps = null;

export async function getUiProperties() {
    if (cachedUiProps) {
        return cachedUiProps;
    }

    try {
        const endpoint = getUiPropertiesEndpoint();
        console.log(`🔍 Fetching UI properties from: ${endpoint}`);
        
        const response = await fetch(endpoint, { 
            cache: 'no-store'
        });
        
        console.log(`📡 UI Properties Response Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            console.error(`❌ Failed to fetch UI properties:`, {
                status: response.status,
                statusText: response.statusText,
                url: endpoint
            });
            return null;
        }

        const data = await response.json();
        console.log('📦 UI Properties Response Data:', {
            hasCCRUIProps: !!data?.CCRUIProps,
            hasAuthUrl: !!data?.CCRUIProps?.CCR_AUTHENTICATION_URL,
            keys: data?.CCRUIProps ? Object.keys(data.CCRUIProps) : 'no props'
        });
        
        cachedUiProps = data?.CCRUIProps || {};
        
        return cachedUiProps;
    } catch (error) {
        console.error("❌ Error fetching ui properties:", {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        return null;
    }
}
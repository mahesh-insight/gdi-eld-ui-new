// Get the API base URL for server-side calls
function getApiBaseUrl() {
  // Always use the API base URL from environment variables
  // This should NEVER use window.location.origin as we're calling external APIs
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                 process.env.API_BASE_URL || 
                 process.env.NEXT_PUBLIC_CCR_API_BASE_URL ||
                 process.env.CCR_API_BASE_URL ||
                 'https://api-ccrdev.insight.com';
  
  console.log('🔍 API Base URL for server config:', apiUrl);
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
        
        if (!response.ok) {
            console.error(`Failed to fetch UI properties: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        cachedUiProps = data?.CCRUIProps || {};
        
        return cachedUiProps;
    } catch (error) {
        console.error("Error fetching ui properties:", error);
        return null;
    }
}
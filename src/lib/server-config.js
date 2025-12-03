// Get the base URL dynamically based on environment
function getBaseUrl() {
  // In browser, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // In server, use environment variable or default
  return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:80';
}

const getUiPropertiesEndpoint = () => `${getBaseUrl()}/ccr-authentication-service/uiproperties`;

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
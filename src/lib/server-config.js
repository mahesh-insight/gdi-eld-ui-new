// Get the UI Properties endpoint - uses different domain than other APIs
function getUiPropertiesEndpoint() {
  // UI Properties has its own domain, different from the main API
  // Local: http://localhost:80/ccr-authentication-service/uiproperties
  // Dev/Prod: https://ccrdev.insight.com/ccr-authentication-service/uiproperties
  
  const isLocal = process.env.NODE_ENV === 'development' && 
                  !process.env.VERCEL;
  
  const baseUrl = isLocal 
    ? 'http://localhost:80'
    : 'https://ccrdev.insight.com';
  
  const endpoint = `${baseUrl}/ccr-authentication-service/uiproperties`;
  
  console.log('🔍 UI Properties endpoint:', {
    isLocal,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    endpoint
  });
  
  return endpoint;
}

let cachedUiProps = null;

export async function getUiProperties() {
    if (cachedUiProps) {
        return cachedUiProps;
    }

    try {
        const endpoint = getUiPropertiesEndpoint();
        console.log(`🔍 Fetching UI properties from: ${endpoint}`);
        
        const response = await fetch(endpoint, { 
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Vercel/Next.js)',
                'Accept': 'application/json'
            }
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
            code: error.code,
            cause: error.cause,
            stack: error.stack
        });
        
        // Log the full error cause chain
        if (error.cause) {
            console.error("❌ Error cause:", error.cause);
        }
        
        return null;
    }
}
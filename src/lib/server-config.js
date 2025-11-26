import 'server-only';

const UI_PROPERTIES_ENDPOINT = "http://localhost:80/ccr-authentication-service/uiproperties";

let cachedUiProps = null;

export async function getUiProperties() {
    if (cachedUiProps) {
        return cachedUiProps;
    }

    try {
        const response = await fetch(UI_PROPERTIES_ENDPOINT, { 
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
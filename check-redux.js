// Quick script to check Redux persistence data
console.log('=== CHECKING REDUX PERSIST DATA ===');

if (typeof window !== 'undefined') {
  try {
    const persistData = localStorage.getItem('persist:ccr-auth');
    console.log('🔍 Raw persist data:', persistData);
    
    if (persistData) {
      const parsed = JSON.parse(persistData);
      console.log('🔍 Parsed persist keys:', Object.keys(parsed));
      console.log('🔍 isAuthenticated:', parsed.isAuthenticated);
      console.log('🔍 accessToken type:', typeof parsed.accessToken);
      console.log('🔍 accessToken value:', parsed.accessToken);
      console.log('🔍 loginResponse type:', typeof parsed.loginResponse);
      
      // Try to parse the accessToken if it's a JSON string
      if (parsed.accessToken && typeof parsed.accessToken === 'string') {
        if (parsed.accessToken.startsWith('"') && parsed.accessToken.endsWith('"')) {
          const unwrappedToken = JSON.parse(parsed.accessToken);
          console.log('🔍 Unwrapped accessToken:', typeof unwrappedToken, unwrappedToken);
        }
      }
      
      // Try to parse the loginResponse
      if (parsed.loginResponse && typeof parsed.loginResponse === 'string') {
        try {
          const loginResponseObj = JSON.parse(parsed.loginResponse);
          console.log('🔍 LoginResponse keys:', Object.keys(loginResponseObj));
          console.log('🔍 LoginResponse tokens:', loginResponseObj.tokens);
          console.log('🔍 LoginResponse bearerToken:', loginResponseObj.tokens?.bearerToken);
        } catch (e) {
          console.log('⚠️ Failed to parse loginResponse:', e.message);
        }
      }
    }
  } catch (e) {
    console.error('❌ Error checking persist data:', e);
  }
}
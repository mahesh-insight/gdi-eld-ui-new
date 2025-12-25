// Debug script to check auth state
console.log('=== DEBUGGING AUTH STATE ===');

if (typeof window !== 'undefined') {
  // Check cookies
  console.log('Document cookies:', document.cookie);
  
  // Check localStorage
  console.log('localStorage persist data:', localStorage.getItem('persist:ccr-auth'));
  
  // Try to parse the persist data
  try {
    const persistData = localStorage.getItem('persist:ccr-auth');
    if (persistData) {
      const parsed = JSON.parse(persistData);
      console.log('Parsed persist data keys:', Object.keys(parsed));
      console.log('isAuthenticated:', parsed.isAuthenticated);
      console.log('has accessToken:', !!parsed.accessToken);
      console.log('has loginResponse:', !!parsed.loginResponse);
    }
  } catch (e) {
    console.error('Error parsing persist data:', e);
  }
}
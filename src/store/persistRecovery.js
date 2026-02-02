/**
 * Redux Persist Recovery Utilities
 * 
 * Use these utilities in development to manually recover or inspect persisted data
 * without losing your authentication.
 */

/**
 * Inspect current persisted auth data
 * Usage in console: window.inspectPersistedAuth()
 */
export function inspectPersistedAuth() {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem('persist:ccr-auth');
    const backup = localStorage.getItem('ccr-auth-backup');
    
    console.log('📦 Persisted Auth Data:');
    console.log('─'.repeat(50));
    
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('✅ Main Storage (persist:ccr-auth):', {
        size: `${(raw.length / 1024).toFixed(2)} KB`,
        keys: Object.keys(parsed),
        hasAccessToken: !!parsed.accessToken,
        hasLoginResponse: !!parsed.loginResponse,
        isAuthenticated: parsed.isAuthenticated,
        soldTo: parsed.soldTo
      });
      
      if (parsed.accessToken) {
        console.log('🔑 Token Preview:', parsed.accessToken.substring(0, 30) + '...');
      }
    } else {
      console.log('❌ No main auth storage found');
    }
    
    console.log('─'.repeat(50));
    
    if (backup) {
      const parsedBackup = JSON.parse(backup);
      console.log('💾 Backup Storage (ccr-auth-backup):', {
        hasAccessToken: !!parsedBackup.accessToken,
        soldTo: parsedBackup.soldTo,
        timestamp: parsedBackup.timestamp
      });
    } else {
      console.log('⚠️ No backup storage found');
    }
    
    return { main: raw ? JSON.parse(raw) : null, backup: backup ? JSON.parse(backup) : null };
  } catch (error) {
    console.error('❌ Error inspecting persisted auth:', error);
    return null;
  }
}

/**
 * Manually create a backup of current auth state
 * Usage: window.backupAuthState()
 */
export function backupAuthState() {
  if (typeof window === 'undefined') return false;
  
  try {
    const raw = localStorage.getItem('persist:ccr-auth');
    if (!raw) {
      console.warn('⚠️ No auth data to backup');
      return false;
    }
    
    const parsed = JSON.parse(raw);
    if (!parsed.accessToken) {
      console.warn('⚠️ No accessToken found in auth data');
      return false;
    }
    
    const backup = {
      accessToken: parsed.accessToken,
      soldTo: parsed.soldTo,
      isAuthenticated: parsed.isAuthenticated,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('ccr-auth-backup', JSON.stringify(backup));
    console.log('✅ Auth backup created successfully at', backup.timestamp);
    return true;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return false;
  }
}

/**
 * Restore auth from backup
 * Usage: window.restoreAuthFromBackup()
 */
export function restoreAuthFromBackup() {
  if (typeof window === 'undefined') return false;
  
  try {
    const backup = localStorage.getItem('ccr-auth-backup');
    if (!backup) {
      console.warn('⚠️ No backup found');
      return false;
    }
    
    const parsed = JSON.parse(backup);
    
    if (!parsed.accessToken) {
      console.warn('⚠️ Backup exists but has no accessToken');
      return false;
    }
    
    // Restore to main storage
    const restoredAuth = {
      isAuthenticated: true,
      accessToken: parsed.accessToken,
      soldTo: parsed.soldTo,
      user: null,
      loginResponse: null,
      contextData: null,
      salesOrg: null
    };
    
    localStorage.setItem('persist:ccr-auth', JSON.stringify(restoredAuth));
    console.log('✅ Auth restored from backup (timestamp:', parsed.timestamp + ')');
    console.log('🔄 Please refresh the page to apply changes');
    
    return true;
  } catch (error) {
    console.error('❌ Error restoring from backup:', error);
    return false;
  }
}

/**
 * Validate persisted data structure
 * Usage: window.validatePersistedData()
 */
export function validatePersistedData() {
  if (typeof window === 'undefined') return null;
  
  const results = {
    auth: { valid: false, errors: [] },
    azure: { valid: false, errors: [] }
  };
  
  // Validate auth
  try {
    const raw = localStorage.getItem('persist:ccr-auth');
    if (!raw) {
      results.auth.errors.push('No auth data found');
    } else {
      const parsed = JSON.parse(raw);
      
      if (typeof parsed !== 'object') {
        results.auth.errors.push('Auth data is not an object');
      } else {
        if (!parsed.accessToken) results.auth.errors.push('Missing accessToken');
        if (parsed.isAuthenticated === undefined) results.auth.errors.push('Missing isAuthenticated');
        
        // Check for non-serializable data
        Object.keys(parsed).forEach(key => {
          const value = parsed[key];
          if (typeof value === 'function') {
            results.auth.errors.push(`Non-serializable: ${key} is a function`);
          }
          if (value === undefined) {
            results.auth.errors.push(`Invalid: ${key} is undefined`);
          }
        });
        
        results.auth.valid = results.auth.errors.length === 0;
      }
    }
  } catch (error) {
    results.auth.errors.push(`Parse error: ${error.message}`);
  }
  
  // Validate Azure Invoice
  try {
    const raw = localStorage.getItem('persist:ccr-azure-invoice');
    if (!raw) {
      results.azure.errors.push('No azure invoice data found');
    } else {
      JSON.parse(raw); // Just check if it parses
      results.azure.valid = true;
    }
  } catch (error) {
    results.azure.errors.push(`Parse error: ${error.message}`);
  }
  
  console.log('📊 Validation Results:');
  console.log('Auth:', results.auth.valid ? '✅ Valid' : '❌ Invalid', results.auth.errors);
  console.log('Azure:', results.azure.valid ? '✅ Valid' : '❌ Invalid', results.azure.errors);
  
  return results;
}

/**
 * Emergency: Manually inject auth token
 * Usage: window.emergencyInjectToken('your-token-here', 'your-soldto-id')
 */
export function emergencyInjectToken(accessToken, soldTo = null) {
  if (typeof window === 'undefined') return false;
  
  if (!accessToken) {
    console.error('❌ No token provided');
    return false;
  }
  
  try {
    const authData = {
      isAuthenticated: true,
      accessToken: accessToken,
      soldTo: soldTo,
      user: null,
      loginResponse: null,
      contextData: null,
      salesOrg: null
    };
    
    localStorage.setItem('persist:ccr-auth', JSON.stringify(authData));
    
    // Also create backup
    localStorage.setItem('ccr-auth-backup', JSON.stringify({
      accessToken,
      soldTo,
      timestamp: new Date().toISOString()
    }));
    
    console.log('✅ Token injected successfully');
    console.log('🔄 Please refresh the page to apply changes');
    return true;
  } catch (error) {
    console.error('❌ Error injecting token:', error);
    return false;
  }
}

// Make utilities available in browser console during development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.inspectPersistedAuth = inspectPersistedAuth;
  window.backupAuthState = backupAuthState;
  window.restoreAuthFromBackup = restoreAuthFromBackup;
  window.validatePersistedData = validatePersistedData;
  window.emergencyInjectToken = emergencyInjectToken;
}

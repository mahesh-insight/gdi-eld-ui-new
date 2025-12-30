# Redux Persist - Bulletproof Auth Recovery System

## 🛡️ Protection Features

This implementation provides **bulletproof protection** against auth data loss during development with multiple layers of defense.

---

## 🔐 Multi-Layer Defense System

### Layer 1: Data Validation Before Persist
- Removes `undefined` values automatically
- Converts non-serializable data (Dates → ISO strings)
- Filters out functions, symbols
- Logs all transformations

### Layer 2: Automatic Backup System
- Creates `ccr-auth-backup` on every write
- Stores critical fields: `accessToken`, `soldTo`, `timestamp`
- Independent of main storage (survives main corruption)

### Layer 3: Smart Recovery on Rehydration Error
When rehydration fails, the system tries (in order):

1. **Backup Recovery**: Restores from `ccr-auth-backup`
2. **Manual Parse**: Extracts token from corrupted JSON using regex
3. **Redux Injection**: Manually dispatches recovered data to store
4. **Clean Rewrite**: Rewrites clean data back to storage

**Only clears if ALL recovery attempts fail!**

### Layer 4: Development Tools
Browser console utilities for manual intervention:
- `window.inspectPersistedAuth()` - View current state
- `window.backupAuthState()` - Create manual backup
- `window.restoreAuthFromBackup()` - Restore from backup
- `window.validatePersistedData()` - Check for corruption
- `window.emergencyInjectToken(token, soldTo)` - Force inject token

### Layer 5: Enhanced Logging
- All auth actions logged in development
- Payload validation warnings
- Recovery attempt tracking
- Final status reports

---

## 🚀 How to Use During Development

### Normal Operation
Everything works automatically. You'll see these logs:
```
✅ Redux Persist: Store rehydration complete successfully
📊 Auth State After Rehydration: { isAuthenticated: true, hasAccessToken: true, ... }
```

### When Error Occurs
Instead of losing everything, you'll see:
```
🚨 Redux Persist: Rehydration error detected
🔧 Attempting to recover auth data...
✅ Recovered auth from backup
🎉 Auth data recovered successfully! User stays logged in.
```

### Manual Inspection
Open browser console and run:
```javascript
// Check current persisted data
window.inspectPersistedAuth()

// Output:
// ✅ Main Storage: { hasAccessToken: true, isAuthenticated: true, ... }
// 💾 Backup Storage: { hasAccessToken: true, timestamp: "2025-12-29..." }
```

### Manual Recovery
If something goes wrong:
```javascript
// Create a backup right now
window.backupAuthState()

// Later, if data gets corrupted:
window.restoreAuthFromBackup()
// Refresh page - you're back!
```

### Emergency Token Injection
Lost everything? Have your token handy?
```javascript
window.emergencyInjectToken('your-bearer-token-here', 'Insight|SAP|0011082409|2400')
// Refresh page - logged in again!
```

### Validate Data Health
Check if your persisted data is healthy:
```javascript
window.validatePersistedData()

// Output:
// 📊 Validation Results:
// Auth: ✅ Valid []
// Azure: ✅ Valid []
```

---

## 🔍 Understanding the Logs

### Success Logs
```
✅ Redux Persist: Store rehydration complete successfully
✅ Auth persist OUT: Successfully rehydrated auth state
```
**Meaning**: Everything working perfectly.

### Warning Logs
```
⚠️ Auth persist IN: Skipping non-serializable field "callback"
⚠️ Fixing undefined payload for action: auth/setUser
```
**Meaning**: System caught and fixed potential issues automatically.

### Recovery Logs
```
🔧 Attempting to recover auth data...
✅ Recovered auth from backup
🎉 Auth data recovered successfully! User stays logged in.
```
**Meaning**: Error occurred but system recovered automatically. No data lost!

### Critical Logs
```
❌ Auth recovery failed
⚠️ Could not recover auth data - clearing persist:ccr-auth
⚠️ User will need to log in again
```
**Meaning**: All recovery methods failed. This is extremely rare and only happens with complete corruption.

---

## 🎯 What's Protected

### Always Protected (Never Lost)
- `accessToken` - Your authentication token
- `soldTo` - User's sold-to ID
- `isAuthenticated` - Login state

### Protected via Main Storage
- `user` - User object
- `loginResponse` - Complete login data
- `contextData` - User context
- `salesOrg` - Sales organization

### Protection Mechanisms
1. **Transform Functions**: Clean data before saving
2. **Backup Storage**: Separate copy of critical fields
3. **Recovery System**: 3-step recovery on failure
4. **Validation**: Pre-flight checks on all actions
5. **Development Tools**: Manual intervention when needed

---

## 🐛 Troubleshooting

### "Auth data keeps disappearing"
1. Open console and run: `window.inspectPersistedAuth()`
2. Check for error logs with 🚨 emoji
3. Run: `window.validatePersistedData()`
4. If corrupted, run: `window.restoreAuthFromBackup()`

### "Can't log in after page refresh"
1. Check browser console for rehydration errors
2. Run: `window.inspectPersistedAuth()`
3. If no backup, use: `window.emergencyInjectToken(token, soldTo)`

### "Want to prevent any data loss"
Run this after successful login:
```javascript
window.backupAuthState()
```
Creates a manual backup checkpoint.

### "Need to clear everything and start fresh"
```javascript
localStorage.clear()
// Refresh page
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Redux Store (Memory)                     │
│  { auth: { accessToken, user, loginResponse, ... } }        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Redux Persist
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Transform Layer (Validation)                    │
│  • Remove undefined                                          │
│  • Convert Dates → ISO strings                               │
│  • Filter non-serializable data                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓
         ┌─────────────┴──────────────┐
         │                            │
         ↓                            ↓
┌──────────────────┐         ┌──────────────────┐
│ localStorage:     │         │ localStorage:     │
│ persist:ccr-auth │         │ ccr-auth-backup  │
│ (Main Storage)   │         │ (Backup Storage) │
│                  │         │                  │
│ Full auth state  │         │ Critical fields  │
└──────────────────┘         └──────────────────┘
         │                            │
         │                            │
         └──────────┬─────────────────┘
                    │
         On Rehydration Error
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              Recovery System (3 Attempts)                    │
│                                                              │
│  1. Backup Recovery → Read from ccr-auth-backup             │
│  2. Manual Parse → Regex extract from corrupted main        │
│  3. Redux Injection → Manually restore to store             │
│                                                              │
│  ✅ Success → User stays logged in                          │
│  ❌ All failed → Clear storage, user must re-login          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Best Practices

### Do's ✅
- Always dispatch `null` instead of `undefined`
- Use the provided recovery tools during development
- Check console logs for warnings
- Run `backupAuthState()` before risky operations
- Validate data with `validatePersistedData()` regularly

### Don'ts ❌
- Don't dispatch actions with `undefined` payload
- Don't store functions, Promises, or Dates directly
- Don't manually edit localStorage without backup
- Don't ignore warning logs (⚠️)
- Don't clear localStorage unless absolutely necessary

---

## 📝 Code Examples

### Correct Action Dispatch
```javascript
// ✅ Good - null is serializable
dispatch(setLoginResponse(null))

// ✅ Good - valid object
dispatch(setLoginResponse({ 
  tokens: { bearerToken: 'abc123' },
  userProfile: { ... }
}))

// ❌ Bad - undefined is not serializable
dispatch(setLoginResponse(undefined))

// ❌ Bad - Date objects not serializable
dispatch(setLoginResponse({ 
  loginTime: new Date() 
}))
```

### Safe State Updates
```javascript
// ✅ Good - clean object
const userData = {
  name: 'John',
  email: 'john@example.com',
  soldToId: 'Insight|SAP|123|456'
}
dispatch(setUser(userData))

// ❌ Bad - has undefined
const userData = {
  name: 'John',
  email: undefined, // Will be filtered out
  callback: () => {} // Will be filtered out
}
```

---

## 🔬 Testing Recovery

Want to test if recovery works? Try this:

```javascript
// 1. Corrupt the main storage
localStorage.setItem('persist:ccr-auth', 'invalid{json')

// 2. Refresh page
// You should see recovery logs

// 3. Check console
// ✅ "Auth data recovered successfully! User stays logged in."

// 4. Verify you're still logged in
window.inspectPersistedAuth()
```

---

## 📞 Support

If you encounter issues:
1. Check console logs for 🚨 errors
2. Run `window.inspectPersistedAuth()`
3. Run `window.validatePersistedData()`
4. Try `window.restoreAuthFromBackup()`
5. Last resort: `window.emergencyInjectToken(token, soldTo)`

All recovery tools are available in development mode via browser console.

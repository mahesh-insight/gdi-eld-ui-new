# CCR Application Architecture Guide

## 📋 Table of Contents
1. [Application Flow](#application-flow)
2. [Redux Slices Explained](#redux-slices-explained)
3. [End-to-End Example: Auth Slice](#end-to-end-example-auth-slice)
4. [Folder Structure Explained](#folder-structure-explained)
5. [Key Concepts](#key-concepts)

---

## 🚀 Application Flow

### Execution Order (From Start to Finish)

```
1. Next.js App Router Entry Point
   ├── src/app/layout.js (Root Layout - Server Component)
   │   ├── Loads global CSS
   │   ├── Wraps app with ClientLayout
   │   └── Provides <html> and <body> structure
   │
2. src/app/ClientLayout.jsx (Client Component)
   ├── Initializes Redux store with ReduxProvider
   ├── Sets up Redux Persist (rehydrates state from localStorage)
   ├── Provides CookieSync component (syncs Redux → cookies)
   ├── Provides AuthContextInitializer (validates auth state)
   └── Provides KendoIntlProvider (i18n for UI components)
   │
3. src/app/page.js (Home Page - Server Component)
   ├── Reads URL query params (auth code, soldTo, etc.)
   ├── Redirects to /Unauthorised if error=access_denied
   └── Renders HomePageClient with auth code
   │
4. src/components/HomePageClient.jsx (Client Component)
   ├── Fetches UI Properties from internal endpoint
   ├── Checks for existing session in Redux store
   ├── If auth code exists → Process authentication
   │   ├── Calls /api/auth/token to exchange code for token
   │   ├── Stores auth data in Redux (dispatches actions)
   │   └── Redirects to /invoices or last visited page
   ├── If already authenticated → Redirect to authenticated page
   └── If no auth → Shows login button
   │
5. Protected Pages (e.g., /invoices, /dashboard)
   ├── src/app/invoices/page.js (Server Component)
   │   ├── Validates cookies server-side
   │   ├── Fetches initial data (SSR)
   │   └── Passes data to InvoicesClientContent
   │
   ├── src/app/invoices/InvoicesClientContent.jsx (Client Component)
   │   ├── Receives SSR data as props
   │   ├── Uses Redux for state management
   │   ├── Calls API routes for data fetching
   │   └── Renders UI with Kendo React components
```

---

## 🗃️ Redux Slices Explained

### What is a Reducer?
A **reducer** is a pure function that takes the current state and an action, then returns a new state.

```javascript
// Example reducer logic
currentState + action = newState
```

Redux Toolkit's `createSlice` automatically generates:
- Action creators (functions to dispatch actions)
- Reducer function (handles state updates)

---

### 1. **authSlice** - Authentication State Management

**Purpose**: Manages user authentication status, tokens, and user profile data.

**State Structure**:
```javascript
{
  isAuthenticated: false,       // Login status
  isLoading: false,             // Loading indicator
  user: null,                   // User profile
  loginResponse: null,          // Complete API response
  accessToken: null,            // Bearer token for API calls
  contextData: null,            // Additional context
  soldTo: null,                 // Customer account ID
  salesOrg: null                // Sales organization ID
}
```

**Key Actions**:
- `setAuthenticated(boolean)` - Mark user as logged in/out
- `setUser(userObject)` - Store user profile
- `setLoginResponse(response)` - Store complete login data
- `setAccessToken(token)` - Store bearer token
- `initializeAuth(payload)` - Initialize all auth data at once
- `clearAuth()` - Log user out (reset to initial state)

**Persistence**: ✅ **YES** - Stored in localStorage via Redux Persist
- Key: `persist:ccr-auth`
- Survives page refreshes and browser restarts
- Cleared only on explicit logout

---

### 2. **uiSlice** - UI Configuration & Theme

**Purpose**: Manages application-wide UI settings and properties from backend.

**State Structure**:
```javascript
{
  properties: null,             // UI config from backend (CCR_AUTHENTICATION_URL, etc.)
  theme: 'light',               // Dark/light theme
  sidebarOpen: false,           // Sidebar visibility
  loading: false,               // Global loading state
  notifications: []             // Toast notifications
}
```

**Key Actions**:
- `setProperties(props)` - Store backend UI configuration
- `setTheme(theme)` - Toggle dark/light mode
- `setSidebarOpen(boolean)` - Show/hide sidebar
- `addNotification(notification)` - Show toast
- `removeNotification(id)` - Dismiss toast

**Usage Example**:
```javascript
// In HomePageClient.jsx - fetch and store UI properties
const uiProps = await fetch('/ccr-authentication-service/uiproperties');
dispatch(setProperties(uiProps));

// In any component - read UI properties
const AUTH_URL = useSelector(state => state.ui.properties?.CCR_AUTHENTICATION_URL);
```

**Persistence**: ❌ **NO** - Fetched fresh on each session

---

### 3. **gridSlice** - Data Grid Configuration

**Purpose**: Stores grid settings like columns, filters, sorting, pagination.

**State Structure**:
```javascript
{
  settings: {},                 // Generic grid settings
  columns: [],                  // Column definitions
  filters: {},                  // Active filters
  sorting: null,                // Sort configuration
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0
  }
}
```

**Key Actions**:
- `setSettings(settings)` - Store grid preferences
- `setColumns(columns)` - Define visible columns
- `setFilters(filters)` - Apply filters
- `setSorting(sort)` - Sort data
- `setPagination(pagination)` - Page through data
- `clearGrid()` - Reset to defaults

**Use Case**: When user changes grid columns or filters, store in Redux so state persists during navigation within the session.

**Persistence**: ❌ **NO** - Session-only

---

### 4. **pageSlice** - Current Page Metadata

**Purpose**: Tracks current page information, breadcrumbs, and localization.

**State Structure**:
```javascript
{
  intlLocalProvider: 'en-US',   // Locale for date/number formatting
  currentPage: null,            // Active page identifier
  breadcrumbs: [],              // Breadcrumb trail
  pageTitle: ''                 // Page title
}
```

**Key Actions**:
- `setIntlLocalProvider(locale)` - Change language/region
- `setCurrentPage(page)` - Mark active page
- `setBreadcrumbs(crumbs)` - Update navigation trail
- `setPageTitle(title)` - Set page title

**Persistence**: ❌ **NO** - Session-only

---

### 5. **userSlice** - Extended User Profile

**Purpose**: Stores detailed user information, account lists, and customer data.

**State Structure**:
```javascript
{
  isLoggedInState: false,
  userState: [{
    userID: "",
    role: "",
    firstName: "",
    lastName: "",
    soldToList: [...]             // Multiple accounts
  }],
  selectedAccountState: [{
    soldToID: "",
    soldToName: "",
    tenantIds: ""
  }],
  customerSearchState: [{
    data: [],
    value: "",
    opened: false
  }],
  invoiceMonthState: [],
  loginResponseState: [...]
}
```

**Key Actions**: (Various setters for each state property)

**Difference from authSlice**:
- `authSlice` = Basic auth status & token
- `userSlice` = Detailed user profile & business data

**Persistence**: ❌ **NO** - Session-only

---

## 🔄 End-to-End Example: Auth Slice

Let's trace authentication from login to using the token in an API call.

### Step 1: User Clicks "Login" Button

```javascript
// In HomePageClient.jsx
const handleLogin = () => {
  const authUrl = `${AUTH_URL}/oauth/authorize?client_id=...&redirect_uri=...`;
  window.location.href = authUrl; // Redirect to Ping Identity
};
```

### Step 2: User Returns with Auth Code

After successful login, Ping redirects user back to:
```
https://yourapp.com/?code=ABC123XYZ&soldTo=0011035258
```

### Step 3: Exchange Code for Token (Server-side)

```javascript
// src/app/api/auth/token/route.js (API Route)
export async function POST(request) {
  const { code, soldTo } = await request.json();
  
  // Exchange code for access token
  const tokenResponse = await fetch(`${AUTH_URL}/oauth/token`, {
    method: 'POST',
    body: JSON.stringify({ code, grant_type: 'authorization_code' })
  });
  
  const data = await tokenResponse.json();
  return Response.json(data); // Return { bearerToken, userProfile, ... }
}
```

### Step 4: Store Auth Data in Redux

```javascript
// In HomePageClient.jsx (Client Component)
const processAuthCode = async (code) => {
  // Call API route
  const response = await fetch('/api/auth/token', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  
  const authData = await response.json();
  
  // Dispatch actions to update Redux store
  dispatch(setLoginResponse(authData));           // Stores complete response
  dispatch(setAccessToken(authData.bearerToken)); // Stores token
  dispatch(setUser(authData.userProfile));        // Stores user info
  dispatch(setAuthenticated(true));               // Marks as logged in
  
  // Redux Persist automatically saves to localStorage
  console.log('✅ Auth data stored in Redux and persisted');
};
```

### Step 5: Redux Persist Saves to LocalStorage

Automatically happens! Redux Persist middleware intercepts the actions and saves:

```javascript
// Browser localStorage
localStorage.setItem('persist:ccr-auth', JSON.stringify({
  isAuthenticated: true,
  accessToken: "eyJhbGciOiJSUzI1NiIs...",
  user: { firstName: "John", ... },
  // ... other auth fields
}));
```

### Step 6: CookieSync Component Syncs to Cookies

```javascript
// In src/components/CookieSync.jsx
useEffect(() => {
  const { accessToken, user } = useSelector(state => state.auth);
  
  if (accessToken) {
    // Set cookie for server-side access
    document.cookie = `access_token=${accessToken}; path=/; secure; samesite=strict`;
    document.cookie = `user_context=${JSON.stringify(user)}; path=/`;
  }
}, [accessToken, user]);
```

**Why cookies?** Next.js server components need access to auth data during SSR. Cookies are sent automatically with every request.

### Step 7: Using Token in API Calls

```javascript
// In any component or API route
import { getAuthConfig } from '@/lib/api/request';

const fetchInvoices = async () => {
  // getAuthConfig() reads token from Redux store
  const config = getAuthConfig();
  
  const response = await fetch('/api/ccr/invoices', {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};
```

### Step 8: Token Validation on Protected Pages

```javascript
// In src/app/invoices/page.js (Server Component)
import { cookies } from 'next/headers';

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  if (!accessToken) {
    redirect('/'); // Not authenticated, redirect to home
  }
  
  // Fetch data with token
  const invoices = await fetchInvoicesServerSide(accessToken);
  
  return <InvoicesClientContent initialData={invoices} />;
}
```

### Step 9: Auto-Rehydration on Page Refresh

When user refreshes browser:

```javascript
// Redux Persist automatically runs
1. Reads localStorage('persist:ccr-auth')
2. Parses JSON data
3. Dispatches REHYDRATE action
4. Updates Redux store with saved state
5. CookieSync sees the token and syncs to cookies
6. User stays logged in! ✅
```

---

## 📁 Folder Structure Explained

### `src/lib/cache/` - Server-side Caching

**Purpose**: Reduce API calls and improve performance using in-memory or Redis cache.

**Files**:
- `serverCache.js` - Main cache implementation (Memory/Redis)
- `cacheKeys.js` - Standardized cache key generation
- `reduxCacheUtils.js` - Client-side cache helpers
- `examples.js` - Usage examples

**Example Usage**:
```javascript
import { getCachedData, setCachedData } from '@/lib/cache/serverCache';

export async function fetchInvoiceMonthsServer(soldToId, provider) {
  const cacheKey = `invoice-months-${soldToId}-${provider}`;
  
  // Try cache first
  const cached = await getCachedData(cacheKey);
  if (cached) return cached;
  
  // Cache miss - fetch from API
  const response = await fetch(`/api/invoice-months?soldTo=${soldToId}`);
  const data = await response.json();
  
  // Store in cache for 5 minutes
  await setCachedData(cacheKey, data, 5 * 60 * 1000);
  
  return data;
}
```

**Benefits**:
- Faster page loads (SSR)
- Reduced backend load
- Better user experience

---

### `src/lib/auth/` - Authentication Utilities

**Purpose**: Manage authentication state, sessions, and cookie syncing.

**Files**:
- `sessionManager.js` - Session validation & last visited page tracking
- `cookieSync.js` - Sync Redux auth state to cookies

**Key Functions**:

```javascript
// sessionManager.js
export function hasActiveSession() {
  // Check if access_token cookie exists
  const cookies = document.cookie.split(';');
  const token = cookies.find(c => c.includes('access_token'));
  return !!token;
}

export function saveLastVisitedPage(path) {
  // Store in localStorage for redirect after login
  localStorage.setItem('ccr_last_visited_page', path);
}

export function getAuthenticatedRedirectPath() {
  // Get last visited page or default to /invoices
  return localStorage.getItem('ccr_last_visited_page') || '/invoices';
}
```

**Use Case**: When user logs in, redirect them to the page they were trying to access.

---

### `src/lib/api/` - API Layer

**Purpose**: Centralized API communication, request configuration, error handling.

**Files**:
- `services.js` - Base URL configuration & environment detection
- `request.js` - HTTP client with auth headers
- `chartDataUtils.js` - Transform API data for charts

**Example**:

```javascript
// services.js - Environment-based API base URL
export const getEnvironmentConfig = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Auto-detect environment
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8080';
  }
  
  return 'https://api-ccrqa.insight.com';
};

// request.js - Configured HTTP client
import axios from 'axios';
import { getAuthConfig } from '@/lib/auth-utils';

const apiClient = axios.create({
  baseURL: getEnvironmentConfig(),
  timeout: 30000
});

apiClient.interceptors.request.use(config => {
  const { token } = getAuthConfig();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

### `src/lib/utils/` - Utility Functions

**Purpose**: Reusable helper functions for formatting, validation, transformations.

**Common Utilities**:
```javascript
// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Format dates
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Debounce function (for search inputs)
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

---

## 🎯 Key Concepts

### 1. **Server vs Client Components**

**Next.js 13+ App Router** uses React Server Components by default.

```javascript
// Server Component (default)
// - Runs on server only
// - Can fetch data directly
// - Cannot use useState, useEffect, Redux
export default async function InvoicesPage() {
  const data = await fetchData(); // Direct async
  return <div>{data}</div>;
}

// Client Component (needs "use client")
// - Runs on browser
// - Can use hooks, Redux, event handlers
"use client";
import { useState } from 'react';

export default function InvoicesClient() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 2. **Redux Persist Lifecycle**

```
User Action → Dispatch Action → Reducer Updates State → Redux Persist Saves to localStorage
                                        ↑
                                        |
                              Page Refresh/Reload
                                        |
                                        ↓
Redux Persist Reads localStorage → Dispatches REHYDRATE → State Restored
```

### 3. **SSR Data Flow**

```
1. User requests /invoices
2. Next.js server runs InvoicesPage() server component
3. Server fetches data from API (using cookies for auth)
4. Server renders HTML with data
5. Sends HTML to browser
6. Browser hydrates React (makes interactive)
7. Client component (InvoicesClientContent) takes over
8. Further interactions use client-side fetching
```

### 4. **Cache Strategy**

```
Request → Check Memory Cache → Check Redis → Call API → Cache Result → Return Data
            ↓ HIT                ↓ HIT        ↓ MISS
         Return Data         Return Data   Store in Cache
```

---

## 🔍 Quick Reference

### When to Use Each Slice

| Slice | Use When | Example |
|-------|----------|---------|
| `authSlice` | Login/logout, storing tokens | User logs in, need token for API |
| `uiSlice` | UI config, theme, notifications | Backend returns feature flags |
| `gridSlice` | Grid settings, filters, sorting | User filters invoice grid |
| `pageSlice` | Page title, breadcrumbs, locale | Update page title in header |
| `userSlice` | Extended user profile, accounts | Display user's account list |

### Folder Quick Guide

| Folder | Purpose | When to Add Files |
|--------|---------|-------------------|
| `lib/cache/` | Caching logic | Adding new cache adapter |
| `lib/auth/` | Auth utilities | New session management feature |
| `lib/api/` | API communication | New API integration |
| `lib/utils/` | Helper functions | Reusable formatting/validation |

---

## 📚 Further Reading

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Redux Toolkit Official Guide](https://redux-toolkit.js.org/)
- [Redux Persist Documentation](https://github.com/rt2zz/redux-persist)

---

**Last Updated**: February 11, 2026

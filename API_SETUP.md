# API Configuration Guide

## Overview

This project uses a dynamic request system that supports GET, POST, PUT, DELETE, and PATCH methods. The system works in both client-side and server-side environments.

## Files Created/Updated

1. **`/src/lib/api/request.js`** - Main request handler with axios
2. **`/src/lib/api/services.js`** - API endpoint configurations  
3. **`/src/xps-utils/core/api-response-handler.js`** - Response processing utility
4. **`/src/app/auth/callback/route.js`** - Updated to use the new request system

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# API Base URL for server-side requests
API_BASE_URL=https://your-api-domain.com

# API Base URL for client-side requests (must be prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

### Service Configuration

Update `/src/lib/api/services.js` to add your API endpoints:

```javascript
const services = {
  loginAuthCode: {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL,
    url: '/your-actual-login-endpoint', // Update this path
    headers: {
      'Content-Type': 'application/json',
    },
    noAuthHeader: true,
  },
  // Add more services as needed
};
```

## Usage

### Server-side (API Routes)

```javascript
import request from "../../../lib/api/request";

// POST request
const response = await request.post("loginAuthCode", {
  data: authCode,
  params: { soldto: soldTo, salesorg: salesOrg }
});

// GET request
const response = await request.get("someService", {
  params: { id: 123 }
});
```

### Client-side (Components)

```javascript
import request from "@/lib/api/request";

// The request system automatically handles localStorage tokens on client-side
const response = await request.post("someAPI", { data: formData });
```

## Authentication

- **Client-side**: Automatically reads `access_token` from localStorage
- **Server-side**: Pass token in configuration if needed:

```javascript
const response = await request.post("protectedAPI", {
  data: payload,
  accessToken: bearerToken // for server-side authenticated requests
});
```

## Current Status

✅ Request system created and configured
✅ Auth callback route updated to use new system
✅ Server can make API calls without browser dependencies
✅ System supports both client and server environments

## Next Steps

1. Update the `loginAuthCode` service URL in `services.js` to point to your actual API endpoint
2. Add your real API base URL to `.env.local`
3. Test the auth flow with a real auth code
4. Add more service configurations as needed
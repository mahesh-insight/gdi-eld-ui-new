# Azure Spend Widget - Embed Integration Guide

## Overview
The Azure Spend Widget can be securely embedded into external websites using iframe and postMessage API for secure cross-origin communication.

## Port Configuration
- **Next.js Widget Server**: `http://localhost:3000` (this application)
- **React Parent App**: `http://localhost:8080` (your external application)

## Security Features
- ✅ **No token in URL**: Token passed via postMessage (not visible in browser history)
- ✅ **Origin validation**: Whitelisted domains only
- ✅ **Server-side proxy**: API calls made from your server
- ✅ **CORS support**: Cross-origin requests handled securely

## Quick Start

### 1. Configure Allowed Origins
Update the allowed origins in `/src/app/widgets/azure-spend/page.jsx`:

```javascript
const [allowedOrigins] = useState([
  'http://localhost:8080', // Your React app
  'http://localhost:8081',
  'https://your-production-domain.com',
  // Add more trusted domains
]);
```

### 2. Embed the Widget

#### HTML Integration
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Application</title>
</head>
<body>
  <iframe 
    id="azureSpendWidget" 
    src="http://localhost:3000/widgets/azure-spend"
    width="420"
    height="600"
    style="border: none;">
  </iframe>

  <script src="embed-widget.js"></script>
</body>
</html>
```

#### JavaScript (embed-widget.js)
```javascript
const widgetFrame = document.getElementById('azureSpendWidget');
const WIDGET_ORIGIN = 'http://localhost:3000';

// Listen for messages from the widget
window.addEventListener('message', (event) => {
  // Validate origin
  if (event.origin !== WIDGET_ORIGIN) {
    return;
  }

  const { type, ...data } = event.data;

  switch (type) {
    case 'WIDGET_READY':
      console.log('Widget ready, sending auth token...');
      
      // Get your access token (from your auth system)
      const accessToken = getAccessToken(); // Your function to get token
      const soldToId = 'Insight|SAP|0011035258|2400';
      
      // Send token securely via postMessage
      widgetFrame.contentWindow.postMessage(
        {
          type: 'AUTH_TOKEN',
          token: accessToken,
          soldToId: soldToId
        },
        WIDGET_ORIGIN
      );
      break;

    case 'WIDGET_LOADED':
      console.log('Widget loaded successfully!', data);
      break;

    case 'WIDGET_ERROR':
      console.error('Widget error:', data);
      alert(`Error loading widget: ${data.error}`);
      break;
  }
});

function getAccessToken() {
  // Implement your token retrieval logic
  // This should fetch from your secure storage or authentication system
  return 'your-secure-token-here';
}
```

## Message Flow

```
Parent Page                    Widget (iframe)
    |                               |
    |------- Load iframe ---------->|
    |                               |
    |<----- WIDGET_READY ----------|
    |                               |
    |-- AUTH_TOKEN (with token) -->|
    |                               |
    |                          [Fetch data]
    |                               |
    |<---- WIDGET_LOADED ----------|  (or WIDGET_ERROR)
    |                               |
```

## Message Types

### From Widget to Parent

#### WIDGET_READY
Sent when the widget is loaded and ready to receive the auth token.
```javascript
{
  type: 'WIDGET_READY',
  timestamp: '2026-02-20T10:30:00.000Z',
  needsAuth: true
}
```

#### WIDGET_LOADED
Sent when data has been successfully fetched and rendered.
```javascript
{
  type: 'WIDGET_LOADED',
  success: true
}
```

#### WIDGET_ERROR
Sent when an error occurs.
```javascript
{
  type: 'WIDGET_ERROR',
  error: 'Unauthorized',
  details: 'Access token is required'
}
```

### From Parent to Widget

#### AUTH_TOKEN
Send this to provide the access token and soldToId.
```javascript
{
  type: 'AUTH_TOKEN',
  token: 'your-bearer-token',
  soldToId: 'Insight|SAP|0011035258|2400'
}
```

## API Endpoint (Server-side Proxy)

The widget uses a server-side proxy at `/api/widgets/azure-spend` that:
- Accepts the token in Authorization header
- Proxies requests to the CCR Dashboard Service
- Handles CORS for cross-origin requests

### Direct API Usage (Optional)
If you want to call the API directly from your backend:

```javascript
fetch('http://localhost:3000/api/widgets/azure-spend?soldToId=Insight|SAP|0011035258|2400', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));
```

## Testing

1. **Start the Next.js server:**
   ```bash
   npm run dev
   ```

2. **Open the test page:**
   Visit `http://localhost:3000/embed-example.html` in your browser

3. **Enter your access token and click "Load Widget"**

4. **Monitor the console** for postMessage communication

## Production Deployment

### 1. Update allowed origins
Replace `http://localhost:8081` with your production domains in:
- `/src/app/widgets/azure-spend/page.jsx`

### 2. Update CORS settings
In `/src/app/api/widgets/azure-spend/route.js`, change:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  // ...
};
```

### 3. Use HTTPS
Always use HTTPS in production for secure token transmission.

## Troubleshooting

### Widget doesn't load
- Check console for CORS errors
- Verify the widget URL is correct
- Ensure the iframe loads successfully

### Authentication fails
- Verify the access token is valid
- Check if origin is in the allowed list
- Look for postMessage errors in console

### Origin validation errors
- Add the parent domain to `allowedOrigins` array
- Make sure origins match exactly (including protocol and port)

## Security Best Practices

1. **Never expose tokens in URLs** - Use postMessage only
2. **Validate origins strictly** - Only whitelist trusted domains
3. **Use HTTPS in production** - Encrypt all communication
4. **Rotate tokens regularly** - Implement token refresh logic
5. **Monitor for suspicious activity** - Log and alert on errors

## Example Applications

- Internal dashboards
- Customer portals
- Partner integrations
- Mobile app webviews

## Support

For issues or questions, contact your development team.

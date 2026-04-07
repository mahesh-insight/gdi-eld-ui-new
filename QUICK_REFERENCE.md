# Widget Integration Quick Reference

Quick reference for integrating Azure Spend Widget into your application.

## 🎯 Widget URLs

```
Widget Page:  http://localhost:8081/widgets/azure-spend
API Endpoint: http://localhost:8081/api/widgets/azure-spend
Test Page:    http://localhost:8081/embed-example.html
```

## 📋 Required Parameters

- `soldToId`: Customer identifier (e.g., "Insight|SAP|0011035258|2400")
- `accessToken`: Bearer token for API authentication

## 🔄 postMessage Communication Flow

```
1. Parent loads iframe → http://localhost:8081/widgets/azure-spend
2. Widget sends:      ← { type: 'WIDGET_READY' }
3. Parent sends:      → { type: 'AUTH_TOKEN', token: '...', soldToId: '...' }
4. Widget loads data
5. Widget sends:      ← { type: 'WIDGET_LOADED', success: true }
   OR on error:       ← { type: 'WIDGET_ERROR', error: '...' }
```

## 💻 React Integration (Minimal)

```jsx
import { useEffect, useRef } from 'react';

function AzureWidget({ soldToId, accessToken }) {
  const iframe = useRef(null);
  const ORIGIN = 'http://localhost:8081';

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== ORIGIN) return;
      
      if (e.data.type === 'WIDGET_READY') {
        iframe.current?.contentWindow?.postMessage(
          { type: 'AUTH_TOKEN', token: accessToken, soldToId },
          ORIGIN
        );
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [accessToken, soldToId]);

  return (
    <iframe
      ref={iframe}
      src={`${ORIGIN}/widgets/azure-spend`}
      style={{ width: '100%', height: '600px', border: 'none' }}
    />
  );
}
```

## 📡 Direct API Call (Without iframe)

```javascript
fetch('http://localhost:8081/api/widgets/azure-spend?soldToId=Insight|SAP|0011035258|2400', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

## 🔐 Security Checklist

✅ Use postMessage (not URL params) for tokens  
✅ Validate message origins  
✅ Add your domain to allowed origins list  
✅ Use HTTPS in production  
✅ Implement token refresh  

## 🛠 Configuration Files

### Add Allowed Origin (Widget Server)
```jsx
// src/app/widgets/azure-spend/page.jsx
const [allowedOrigins] = useState([
  'http://localhost:8080', // ← Add your domain here
]);
```

### Enable CORS (API Server)
```jsx
// src/app/api/widgets/azure-spend/route.js
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080', // ← Add your domain
};
```

## 🎨 Styling Options

```jsx
// Fixed height
<iframe style={{ height: '600px' }} />

// Dynamic height (listen for WIDGET_RESIZE message)
useEffect(() => {
  const handleMessage = (e) => {
    if (e.data.type === 'WIDGET_RESIZE') {
      setHeight(e.data.height);
    }
  };
  window.addEventListener('message', handleMessage);
}, []);

// Responsive
<div style={{ position: 'relative', paddingBottom: '56.25%' }}>
  <iframe style={{ 
    position: 'absolute', 
    top: 0, left: 0, 
    width: '100%', 
    height: '100%' 
  }} />
</div>
```

## 🐛 Debug Commands

```bash
# Check if widget server is running
lsof -i :8081

# Test API endpoint
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8081/api/widgets/azure-spend?soldToId=Insight|SAP|0011035258|2400"

# View widget in isolation
open http://localhost:8081/widgets/azure-spend

# View test page
open http://localhost:8081/embed-example.html
```

## 📊 Message Types Reference

### From Widget → Parent

| Type | Data | When |
|------|------|------|
| `WIDGET_READY` | `{ timestamp, needsAuth }` | Widget loaded and ready |
| `WIDGET_LOADED` | `{ success: true }` | Data fetched successfully |
| `WIDGET_ERROR` | `{ error, details }` | Error occurred |
| `WIDGET_RESIZE` | `{ height }` | Widget height changed |

### From Parent → Widget

| Type | Data | When |
|------|------|------|
| `AUTH_TOKEN` | `{ token, soldToId }` | Provide authentication |

## 🔄 Environment Configuration

```javascript
// Development
const WIDGET_URL = 'http://localhost:8081/widgets/azure-spend';

// Staging
const WIDGET_URL = 'https://widgets-staging.yourcompany.com/widgets/azure-spend';

// Production
const WIDGET_URL = 'https://widgets.yourcompany.com/widgets/azure-spend';
```

## 📖 Full Documentation Links

- **Architecture**: [WIDGET_ARCHITECTURE.md](./WIDGET_ARCHITECTURE.md)
- **Integration Guide**: [WIDGET_EMBED_GUIDE.md](./WIDGET_EMBED_GUIDE.md)
- **Examples**: [examples/README.md](./examples/README.md)
- **React Component**: [examples/AzureSpendEmbed.jsx](./examples/AzureSpendEmbed.jsx)

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| CORS error | Origin not allowed | Add domain to CORS headers |
| postMessage ignored | Origin validation failed | Add domain to allowedOrigins |
| No AUTH_TOKEN sent | WIDGET_READY not received | Check iframe loaded correctly |
| API 401 | Invalid/expired token | Refresh access token |
| Widget blank | JavaScript error | Check browser console |

## 📞 Support

- Documentation: See files listed above
- Test locally: http://localhost:8081/embed-example.html
- API health: http://localhost:8081/api/health (if implemented)

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-23  
**Widget Server Port**: 8081  
**Consumer App Ports**: 8080 (React) or any port

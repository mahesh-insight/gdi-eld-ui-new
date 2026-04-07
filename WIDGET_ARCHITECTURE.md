# Next.js Widget Micro-Frontend Architecture Guide

## Overview

This document outlines the ideal architecture for using Next.js widgets as independent, reusable components across different projects (React apps, microsites, other frameworks).

## Current Setup

**Widget Server**: Next.js app on port 8081
- URL: `http://localhost:8081/widgets/azure-spend?soldToId=Insight%7CSAP%7C0011035258%7C2400`
- API Proxy: `/api/widgets/azure-spend` (server-side)
- Communication: iframe + postMessage API

**Consumer Apps**: React apps, microsites on different ports (e.g., port 8080)

---

## Architecture Options

### 1. ✅ **iframe + postMessage (Current - Recommended)**

**Best for**: Maximum isolation, security, and simplicity

#### Architecture Diagram
```
┌─────────────────────────────────────┐
│   Parent App (React - Port 8080)   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  <iframe>                     │ │
│  │  ┌─────────────────────────┐  │ │
│  │  │ Next.js Widget          │  │ │
│  │  │ (Port 8081)             │  │ │
│  │  │                         │  │ │
│  │  │ /widgets/azure-spend    │  │ │
│  │  └─────────────────────────┘  │ │
│  │                               │ │
│  │  postMessage ←→ Communication │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Implementation

**Parent App (React on port 8080):**
```jsx
// src/components/AzureSpendEmbed.jsx
import { useEffect, useRef, useState } from 'react';

export default function AzureSpendEmbed({ soldToId, accessToken }) {
  const iframeRef = useRef(null);
  const [widgetStatus, setWidgetStatus] = useState('loading');
  const WIDGET_URL = 'http://localhost:8081/widgets/azure-spend';
  const WIDGET_ORIGIN = 'http://localhost:8081';

  useEffect(() => {
    const handleMessage = (event) => {
      // Security: Validate origin
      if (event.origin !== WIDGET_ORIGIN) return;

      const { type, ...data } = event.data;

      switch (type) {
        case 'WIDGET_READY':
          console.log('Widget ready, sending auth...');
          // Send token securely via postMessage
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'AUTH_TOKEN',
              token: accessToken,
              soldToId: soldToId
            },
            WIDGET_ORIGIN
          );
          break;

        case 'WIDGET_LOADED':
          setWidgetStatus('loaded');
          console.log('Widget loaded successfully');
          break;

        case 'WIDGET_ERROR':
          setWidgetStatus('error');
          console.error('Widget error:', data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [accessToken, soldToId]);

  return (
    <div className="widget-container">
      {widgetStatus === 'loading' && <div>Loading widget...</div>}
      {widgetStatus === 'error' && <div>Error loading widget</div>}
      
      <iframe
        ref={iframeRef}
        src={WIDGET_URL}
        style={{
          width: '100%',
          height: '600px',
          border: 'none',
          display: widgetStatus === 'loaded' ? 'block' : 'none'
        }}
        title="Azure Spend Widget"
      />
    </div>
  );
}
```

**Usage in Parent App:**
```jsx
// In your React app (port 8080)
import AzureSpendEmbed from './components/AzureSpendEmbed';

function Dashboard() {
  const accessToken = useAuth(); // Your auth hook
  
  return (
    <div>
      <h1>My Dashboard</h1>
      <AzureSpendEmbed 
        soldToId="Insight|SAP|0011035258|2400"
        accessToken={accessToken}
      />
    </div>
  );
}
```

#### Pros
✅ **Perfect isolation**: CSS/JS won't conflict  
✅ **Security**: Token passed via postMessage, not URL  
✅ **Easy deployment**: Widget and parent can deploy independently  
✅ **Framework agnostic**: Works with any framework  
✅ **Multiple versions**: Can run multiple widget versions simultaneously  

#### Cons
❌ **SEO limitations**: iframe content not indexed  
❌ **Size overhead**: Full page load in iframe  
❌ **Layout constraints**: Fixed height or complex resizing logic needed  

---

### 2. 🔄 **Standalone API + Client-Side Rendering**

**Best for**: When you want UI consistency with the parent app

#### Architecture Diagram
```
┌────────────────────────────────────────┐
│   Parent App (React - Port 8080)      │
│                                        │
│   ┌──────────────────────────────┐    │
│   │  AzureSpendWidget Component  │    │
│   │  (Rendered in parent context)│    │
│   └──────────────────────────────┘    │
│              ↓ API Call                │
│              ↓                         │
└──────────────┼─────────────────────────┘
               ↓
┌──────────────┼─────────────────────────┐
│   Next.js Widget Server (Port 8081)   │
│              ↓                         │
│   /api/widgets/azure-spend (API only) │
└────────────────────────────────────────┘
```

#### Implementation

**Next.js Widget Server** (Already exists at `/api/widgets/azure-spend/route.js`)

**Parent React App consumes API directly:**
```jsx
// src/components/AzureSpendWidget.jsx (in your React app)
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2'; // Or your chart library

export default function AzureSpendWidget({ soldToId, accessToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `http://localhost:8081/api/widgets/azure-spend?soldToId=${encodeURIComponent(soldToId)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const result = await response.json();
        setData(result[0]?.data || result);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch:', error);
        setLoading(false);
      }
    }

    fetchData();
  }, [soldToId, accessToken]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  // Render your own UI using the data
  return (
    <div className="azure-spend-widget">
      <h3>Azure Spend</h3>
      <div className="metrics">
        <div>Current: ${data.currentEstimatedUsage}</div>
        <div>Latest: ${data.latestBilledUsage}</div>
      </div>
      {/* Your custom chart component */}
      <Line data={transformData(data)} />
    </div>
  );
}
```

#### Pros
✅ **Full UI control**: Use parent app's design system  
✅ **Better SEO**: Content rendered in parent app  
✅ **Smaller footprint**: No iframe overhead  
✅ **Shared state**: Can integrate with parent's state management  

#### Cons
❌ **Duplicate code**: Widget UI code duplicated across projects  
❌ **Maintenance burden**: Updates needed in multiple places  
❌ **Dependency conflicts**: Chart libraries, CSS may conflict  
❌ **No UI reusability**: Only API is reused  

---

### 3. 🎨 **Web Components (Advanced)**

**Best for**: True framework-agnostic widget reusability

#### Architecture
```
┌─────────────────────────────────────┐
│   Parent App (Any Framework)       │
│                                     │
│   <azure-spend-widget              │
│     sold-to-id="..."               │
│     access-token="...">            │
│   </azure-spend-widget>            │
│                                     │
│   ↓ Web Component (Shadow DOM)     │
└─────────────────────────────────────┘
        ↓
┌───────────────────────────────────┐
│  Widget Server (Port 8081)        │
│  - Serve bundled Web Component JS │
│  - API endpoints                  │
└───────────────────────────────────┘
```

#### Implementation

**Create Web Component Wrapper:**
```jsx
// src/web-components/azure-spend-widget.js
class AzureSpendWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['sold-to-id', 'access-token'];
  }

  connectedCallback() {
    this.render();
    this.fetchData();
  }

  async fetchData() {
    const soldToId = this.getAttribute('sold-to-id');
    const token = this.getAttribute('access-token');
    
    const response = await fetch(
      `http://localhost:8081/api/widgets/azure-spend?soldToId=${soldToId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = await response.json();
    this.renderWidget(data);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 420px;
        }
        .widget { /* styles */ }
      </style>
      <div class="widget">
        <div id="content">Loading...</div>
      </div>
    `;
  }

  renderWidget(data) {
    // Render React component inside shadow DOM
    const root = this.shadowRoot.getElementById('content');
    ReactDOM.render(<AzureSpendWidget data={data} />, root);
  }
}

customElements.define('azure-spend-widget', AzureSpendWidget);
```

**Usage in any app:**
```html
<!-- Works in React, Vue, Angular, vanilla JS -->
<script src="http://localhost:8081/widgets/azure-spend.bundle.js"></script>

<azure-spend-widget
  sold-to-id="Insight|SAP|0011035258|2400"
  access-token="your-token">
</azure-spend-widget>
```

#### Pros
✅ **True framework agnostic**: Works everywhere  
✅ **Encapsulation**: Shadow DOM prevents style leaks  
✅ **Native browser support**: No iframe needed  
✅ **Single source of truth**: Widget updated centrally  

#### Cons
❌ **Complex setup**: Requires bundling and build process  
❌ **Learning curve**: Web Components API  
❌ **Limited React integration**: Shadow DOM + React has quirks  
❌ **Bundle size**: Must ship entire widget code  

---

### 4. 📦 **NPM Package Micro-Frontend**

**Best for**: Organizations with multiple React projects

#### Architecture
```
┌────────────────────────────────────┐
│   NPM Registry / Private Registry  │
│   @yourorg/azure-spend-widget      │
└────────────────────────────────────┘
         ↓ npm install
┌────────────────────────────────────┐
│   Consumer App 1 (React)           │
│   import { AzureSpendWidget }      │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│   Consumer App 2 (React)           │
│   import { AzureSpendWidget }      │
└────────────────────────────────────┘
```

#### Implementation

**Create NPM Package:**
```json
// package.json in widget repo
{
  "name": "@yourorg/azure-spend-widget",
  "version": "1.0.0",
  "main": "dist/index.js",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**Export Widget:**
```jsx
// src/index.js
export { default as AzureSpendWidget } from './components/AzureSpendWidget';
export { default as useAzureSpend } from './hooks/useAzureSpend';
```

**Consumer Usage:**
```bash
npm install @yourorg/azure-spend-widget
```

```jsx
import { AzureSpendWidget } from '@yourorg/azure-spend-widget';

function Dashboard() {
  return (
    <AzureSpendWidget 
      apiBaseUrl="http://localhost:8081"
      soldToId="Insight|SAP|0011035258|2400"
      accessToken={token}
    />
  );
}
```

#### Pros
✅ **Version control**: Semantic versioning  
✅ **Type safety**: Share TypeScript types  
✅ **Code reuse**: Single source of truth  
✅ **Tree shaking**: Import only what you need  

#### Cons
❌ **React-only**: Not framework agnostic  
❌ **Version drift**: Apps may use different versions  
❌ **Deploy coupling**: Must rebuild apps on widget updates  
❌ **Dependency hell**: Peer dependency conflicts  

---

## 🏆 Recommended Architecture: Hybrid Approach

### **Use Case-Based Recommendations:**

| Use Case | Recommended Approach | Why |
|----------|---------------------|-----|
| **Cross-framework embedding** | iframe + postMessage | Works everywhere, isolated |
| **Same org, React apps** | NPM Package | Easy to maintain, type-safe |
| **Public/Third-party embedding** | Web Components | Standard, widely supported |
| **Custom UI needed** | API-only consumption | Full control over rendering |
| **Maximum isolation required** | iframe + postMessage | Security, CSS isolation |

### **Optimal Setup for Your Scenario:**

Based on your requirement to embed in React apps and other microsites:

```
┌─────────────────────────────────────────────────────┐
│          Next.js Widget Server (Port 8081)          │
│                                                     │
│  1. /widgets/azure-spend → iframe embed (primary)  │
│  2. /api/widgets/azure-spend → API (fallback)      │
│  3. /widgets/azure-spend.bundle.js → Web Comp      │
└─────────────────────────────────────────────────────┘
              ↓           ↓              ↓
    ┌─────────────┐  ┌──────────┐  ┌──────────────┐
    │ React App   │  │ Vue App  │  │ Static Site  │
    │ (iframe)    │  │ (API)    │  │ (Web Comp)   │
    └─────────────┘  └──────────┘  └──────────────┘
```

---

## Implementation Checklist

### Current Implementation (iframe + postMessage) ✅

Your current setup is already following best practices:

- [x] Server-side API proxy at `/api/widgets/azure-spend`
- [x] Widget page at `/widgets/azure-spend`
- [x] postMessage for secure token passing
- [x] Origin validation for security
- [x] CORS headers configured
- [x] Error handling and status messages

### Enhancements to Consider:

#### 1. **Add Resizing Support**
```jsx
// In widget page, send height updates
useEffect(() => {
  const sendHeight = () => {
    const height = document.body.scrollHeight;
    window.parent.postMessage(
      { type: 'WIDGET_RESIZE', height },
      '*'
    );
  };
  
  sendHeight();
  window.addEventListener('resize', sendHeight);
  return () => window.removeEventListener('resize', sendHeight);
}, [apiData]);
```

#### 2. **Add Widget Registry**
```jsx
// src/app/api/widgets/registry/route.js
export async function GET() {
  return NextResponse.json({
    widgets: [
      {
        id: 'azure-spend',
        name: 'Azure Spend Widget',
        url: '/widgets/azure-spend',
        version: '1.0.0',
        params: ['soldToId'],
        auth: 'required'
      }
      // Add more widgets
    ]
  });
}
```

#### 3. **Add Health Check**
```jsx
// src/app/api/health/route.js
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

#### 4. **Environment Configuration**
```jsx
// src/config/widget.config.js
export const widgetConfig = {
  development: {
    widgetBaseUrl: 'http://localhost:8081',
    apiBaseUrl: 'http://localhost:8081/api',
    allowedOrigins: ['http://localhost:8080', 'http://localhost:3000']
  },
  staging: {
    widgetBaseUrl: 'https://widgets-staging.yourcompany.com',
    apiBaseUrl: 'https://api-staging.yourcompany.com',
    allowedOrigins: ['https://app-staging.yourcompany.com']
  },
  production: {
    widgetBaseUrl: 'https://widgets.yourcompany.com',
    apiBaseUrl: 'https://api.yourcompany.com',
    allowedOrigins: ['https://app.yourcompany.com', 'https://portal.yourcompany.com']
  }
};
```

---

## Security Best Practices

### 1. **Token Handling**
✅ Use postMessage (not URL params)  
✅ Validate origins strictly  
✅ Implement token refresh  
✅ Use HTTPS in production  

### 2. **CORS Configuration**
```jsx
// Update route.js for production
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};
```

### 3. **Rate Limiting**
```jsx
// Add rate limiting to API routes
import rateLimit from '@/lib/rate-limit';

export async function GET(request) {
  const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500
  });
  
  await limiter.check(request, 10); // 10 requests per minute
  
  // ... rest of handler
}
```

---

## Deployment Strategy

### Development
```bash
# Widget Server
PORT=8081 npm run dev

# Consumer App
PORT=8080 npm run dev
```

### Production

#### Option 1: Subdomain
```
widgets.yourcompany.com → Widget Server
app.yourcompany.com → Consumer App
```

#### Option 2: Path-based
```
yourcompany.com/widgets → Widget Server
yourcompany.com → Main App
```

#### Option 3: CDN
```
cdn.yourcompany.com/widgets → Static widget builds
app.yourcompany.com → Consumer App
```

---

## Testing Strategy

### 1. **Widget Isolation Tests**
```jsx
// tests/widgets/azure-spend.test.jsx
describe('AzureSpendWidget', () => {
  it('renders in iframe', async () => {
    const { iframe } = renderIframe('/widgets/azure-spend');
    await waitFor(() => {
      expect(iframe.contentWindow.document.body).toBeInTheDocument();
    });
  });
  
  it('handles postMessage correctly', async () => {
    const { sendMessage } = renderIframe('/widgets/azure-spend');
    sendMessage({ type: 'AUTH_TOKEN', token: 'test' });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/widgets/azure-spend'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test'
          })
        })
      );
    });
  });
});
```

### 2. **Integration Tests**
```jsx
// tests/integration/widget-embedding.test.jsx
describe('Widget Embedding', () => {
  it('parent can communicate with widget', async () => {
    const parent = render(<ParentApp />);
    const widget = renderIframe('/widgets/azure-spend');
    
    // Widget sends WIDGET_READY
    await waitFor(() => {
      expect(parent.receivedMessages).toContainEqual(
        expect.objectContaining({ type: 'WIDGET_READY' })
      );
    });
    
    // Parent sends AUTH_TOKEN
    widget.sendMessage({ type: 'AUTH_TOKEN', token: 'test', soldToId: '123' });
    
    // Widget sends WIDGET_LOADED
    await waitFor(() => {
      expect(parent.receivedMessages).toContainEqual(
        expect.objectContaining({ type: 'WIDGET_LOADED' })
      );
    });
  });
});
```

---

## Monitoring & Analytics

### 1. **Widget Load Times**
```jsx
// Add to widget page
useEffect(() => {
  const startTime = performance.now();
  
  return () => {
    const loadTime = performance.now() - startTime;
    window.parent.postMessage({
      type: 'WIDGET_METRICS',
      metrics: { loadTime }
    }, '*');
  };
}, []);
```

### 2. **Error Tracking**
```jsx
// Add global error handler
window.addEventListener('error', (event) => {
  window.parent.postMessage({
    type: 'WIDGET_ERROR',
    error: {
      message: event.message,
      stack: event.error?.stack
    }
  }, '*');
});
```

---

## Migration Path

If you want to evolve from iframe to other approaches:

### Phase 1: Current (iframe + postMessage) ✅
- Deploy widget server
- Consumers use iframe embedding
- **Timeline**: Already implemented

### Phase 2: Add API-only Option
- Expose API documentation
- Provide React hooks/components as optional NPM package
- **Timeline**: 1-2 weeks

### Phase 3: Web Components (Optional)
- Build Web Component wrapper
- Provide bundle for non-React consumers
- **Timeline**: 2-4 weeks

---

## Conclusion

**Your current iframe + postMessage architecture is ideal for:**
- ✅ Cross-framework compatibility
- ✅ Security (isolated contexts)
- ✅ Independent deployment
- ✅ Multiple microsites
- ✅ Easy maintenance

**Recommended Next Steps:**
1. ✅ Keep current iframe implementation
2. Add widget resizing support
3. Implement proper error boundaries
4. Add monitoring and analytics
5. Document API for advanced users who want direct API access
6. Consider NPM package if all consumers are React

Your architecture is solid and follows micro-frontend best practices! 🎉

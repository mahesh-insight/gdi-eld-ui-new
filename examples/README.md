# Widget Integration Examples

This directory contains example implementations for integrating the Azure Spend Widget into different types of applications.

## Files

### 1. `AzureSpendEmbed.jsx`
Ready-to-use React component for embedding the widget in React applications.

**Features:**
- Automatic postMessage communication
- Loading states and error handling
- Dynamic iframe resizing
- Environment-aware configuration
- TypeScript-ready

**Quick Start:**
```jsx
import AzureSpendEmbed from './examples/AzureSpendEmbed';

function App() {
  return (
    <AzureSpendEmbed 
      soldToId="Insight|SAP|0011035258|2400"
      accessToken="your-token-here"
      onLoad={() => console.log('Loaded!')}
      onError={(err) => console.error(err)}
    />
  );
}
```

---

## Integration Examples by Framework

### React Application (Port 8080)

#### 1. Basic Integration
```jsx
// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import AzureSpendEmbed from '../components/AzureSpendEmbed';

function Dashboard() {
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Fetch your access token
    fetchAccessToken().then(setAccessToken);
  }, []);

  if (!accessToken) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>My Dashboard</h1>
      
      <div className="widget-section">
        <AzureSpendEmbed 
          soldToId="Insight|SAP|0011035258|2400"
          accessToken={accessToken}
          width="100%"
          height="600px"
        />
      </div>
    </div>
  );
}

export default Dashboard;
```

#### 2. Advanced Integration with Error Handling
```jsx
// src/pages/AdvancedDashboard.jsx
import { useState } from 'react';
import AzureSpendEmbed from '../components/AzureSpendEmbed';

function AdvancedDashboard() {
  const [widgetStatus, setWidgetStatus] = useState(null);
  const accessToken = useAuth(); // Your auth hook

  return (
    <div className="dashboard">
      {widgetStatus === 'error' && (
        <div className="alert alert-error">
          Widget failed to load. Please try again.
        </div>
      )}
      
      <AzureSpendEmbed 
        soldToId="Insight|SAP|0011035258|2400"
        accessToken={accessToken}
        onReady={() => setWidgetStatus('ready')}
        onLoad={() => setWidgetStatus('loaded')}
        onError={(err) => {
          setWidgetStatus('error');
          logError('Widget Error', err);
        }}
        showLoader={true}
        style={{ 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}
```

#### 3. Multiple Widgets
```jsx
// src/pages/MultiWidgetDashboard.jsx
import AzureSpendEmbed from '../components/AzureSpendEmbed';

function MultiWidgetDashboard() {
  const accessToken = useAuth();
  const customers = [
    { id: 'customer-1', soldToId: 'Insight|SAP|0011035258|2400' },
    { id: 'customer-2', soldToId: 'Insight|SAP|0011035259|2400' },
  ];

  return (
    <div className="dashboard-grid">
      {customers.map(customer => (
        <div key={customer.id} className="widget-card">
          <h3>{customer.id}</h3>
          <AzureSpendEmbed 
            soldToId={customer.soldToId}
            accessToken={accessToken}
            height="400px"
          />
        </div>
      ))}
    </div>
  );
}
```

---

### Vue.js Application

```vue
<!-- src/components/AzureSpendWidget.vue -->
<template>
  <div class="azure-spend-widget" :style="{ width, height }">
    <div v-if="loading" class="loader">Loading widget...</div>
    <div v-if="error" class="error">{{ error }}</div>
    
    <iframe
      ref="widgetFrame"
      :src="widgetUrl"
      :style="{ 
        width: '100%', 
        height: '100%', 
        border: 'none',
        display: loaded ? 'block' : 'none'
      }"
      title="Azure Spend Widget"
    />
  </div>
</template>

<script>
export default {
  name: 'AzureSpendWidget',
  props: {
    soldToId: {
      type: String,
      required: true
    },
    accessToken: {
      type: String,
      required: true
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '600px'
    }
  },
  data() {
    return {
      loading: true,
      loaded: false,
      error: null,
      widgetUrl: 'http://localhost:8081/widgets/azure-spend',
      widgetOrigin: 'http://localhost:8081'
    };
  },
  mounted() {
    window.addEventListener('message', this.handleMessage);
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage);
  },
  methods: {
    handleMessage(event) {
      if (event.origin !== this.widgetOrigin) return;
      
      const { type, ...data } = event.data;
      
      switch (type) {
        case 'WIDGET_READY':
          this.$refs.widgetFrame.contentWindow.postMessage(
            {
              type: 'AUTH_TOKEN',
              token: this.accessToken,
              soldToId: this.soldToId
            },
            this.widgetOrigin
          );
          break;
          
        case 'WIDGET_LOADED':
          this.loading = false;
          this.loaded = true;
          this.$emit('loaded', data);
          break;
          
        case 'WIDGET_ERROR':
          this.loading = false;
          this.error = data.error;
          this.$emit('error', data);
          break;
      }
    }
  },
  watch: {
    accessToken(newToken) {
      if (this.loaded && this.$refs.widgetFrame) {
        this.$refs.widgetFrame.contentWindow.postMessage(
          {
            type: 'AUTH_TOKEN',
            token: newToken,
            soldToId: this.soldToId
          },
          this.widgetOrigin
        );
      }
    }
  }
};
</script>

<style scoped>
.azure-spend-widget {
  position: relative;
}

.loader, .error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.error {
  color: red;
}
</style>
```

**Usage in Vue:**
```vue
<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <AzureSpendWidget 
      :sold-to-id="soldToId"
      :access-token="accessToken"
      @loaded="onWidgetLoaded"
      @error="onWidgetError"
    />
  </div>
</template>

<script>
import AzureSpendWidget from './components/AzureSpendWidget.vue';

export default {
  components: { AzureSpendWidget },
  data() {
    return {
      soldToId: 'Insight|SAP|0011035258|2400',
      accessToken: 'your-token'
    };
  },
  methods: {
    onWidgetLoaded(data) {
      console.log('Widget loaded:', data);
    },
    onWidgetError(error) {
      console.error('Widget error:', error);
    }
  }
};
</script>
```

---

### Vanilla JavaScript / HTML

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure Spend Widget - Vanilla JS</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .widget-container {
      position: relative;
      width: 100%;
      height: 600px;
      margin-top: 20px;
    }
    .widget-loader {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
    }
    .widget-loader.hidden {
      display: none;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 8px;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }
    .status.error {
      background: #ffebee;
      border-left-color: #f44336;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Azure Spend Dashboard</h1>
    <div id="status" class="status">Initializing widget...</div>
    
    <div class="widget-container">
      <div id="loader" class="widget-loader">
        <div>Loading widget...</div>
      </div>
      <iframe 
        id="azureSpendWidget"
        src="http://localhost:8081/widgets/azure-spend"
        title="Azure Spend Widget"
      ></iframe>
    </div>
  </div>

  <script>
    // Configuration
    const WIDGET_ORIGIN = 'http://localhost:8081';
    const ACCESS_TOKEN = 'your-access-token-here'; // Get from your auth system
    const SOLD_TO_ID = 'Insight|SAP|0011035258|2400';

    // Elements
    const widgetFrame = document.getElementById('azureSpendWidget');
    const loader = document.getElementById('loader');
    const status = document.getElementById('status');

    // Update status message
    function updateStatus(message, isError = false) {
      status.textContent = message;
      status.className = isError ? 'status error' : 'status';
    }

    // Handle messages from widget
    function handleMessage(event) {
      // Security: Validate origin
      if (event.origin !== WIDGET_ORIGIN) {
        console.warn('Ignored message from:', event.origin);
        return;
      }

      const { type, ...data } = event.data;
      console.log('Received message:', type, data);

      switch (type) {
        case 'WIDGET_READY':
          updateStatus('Widget ready, authenticating...');
          
          // Send authentication token
          widgetFrame.contentWindow.postMessage(
            {
              type: 'AUTH_TOKEN',
              token: ACCESS_TOKEN,
              soldToId: SOLD_TO_ID
            },
            WIDGET_ORIGIN
          );
          break;

        case 'WIDGET_LOADED':
          updateStatus('Widget loaded successfully!');
          loader.classList.add('hidden');
          console.log('Widget data loaded:', data);
          break;

        case 'WIDGET_ERROR':
          updateStatus(`Error: ${data.error || 'Unknown error'}`, true);
          loader.classList.add('hidden');
          console.error('Widget error:', data);
          break;

        case 'WIDGET_RESIZE':
          if (data.height) {
            widgetFrame.style.height = data.height + 'px';
          }
          break;
      }
    }

    // Setup message listener
    window.addEventListener('message', handleMessage);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('message', handleMessage);
    });
  </script>
</body>
</html>
```

---

### Angular Application

```typescript
// src/app/components/azure-spend-widget/azure-spend-widget.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-azure-spend-widget',
  template: `
    <div class="widget-container" [style.width]="width" [style.height]="height">
      <div *ngIf="loading" class="loader">Loading widget...</div>
      <div *ngIf="error" class="error">{{ error }}</div>
      
      <iframe
        #widgetFrame
        [src]="widgetUrl"
        [style.width]="'100%'"
        [style.height]="'100%'"
        [style.border]="'none'"
        [style.display]="loaded ? 'block' : 'none'"
        title="Azure Spend Widget"
      ></iframe>
    </div>
  `,
  styles: [`
    .widget-container {
      position: relative;
    }
    .loader, .error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .error {
      color: red;
    }
  `]
})
export class AzureSpendWidgetComponent implements OnInit, OnDestroy {
  @Input() soldToId!: string;
  @Input() accessToken!: string;
  @Input() width: string = '100%';
  @Input() height: string = '600px';
  
  @Output() widgetLoaded = new EventEmitter<any>();
  @Output() widgetError = new EventEmitter<any>();
  
  @ViewChild('widgetFrame') widgetFrame!: ElementRef<HTMLIFrameElement>;
  
  loading = true;
  loaded = false;
  error: string | null = null;
  widgetUrl = 'http://localhost:8081/widgets/azure-spend';
  widgetOrigin = 'http://localhost:8081';
  
  private messageHandler = this.handleMessage.bind(this);

  ngOnInit() {
    window.addEventListener('message', this.messageHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageHandler);
  }

  private handleMessage(event: MessageEvent) {
    if (event.origin !== this.widgetOrigin) return;
    
    const { type, ...data } = event.data;
    
    switch (type) {
      case 'WIDGET_READY':
        this.widgetFrame.nativeElement.contentWindow?.postMessage(
          {
            type: 'AUTH_TOKEN',
            token: this.accessToken,
            soldToId: this.soldToId
          },
          this.widgetOrigin
        );
        break;
        
      case 'WIDGET_LOADED':
        this.loading = false;
        this.loaded = true;
        this.widgetLoaded.emit(data);
        break;
        
      case 'WIDGET_ERROR':
        this.loading = false;
        this.error = data.error;
        this.widgetError.emit(data);
        break;
    }
  }
}
```

**Usage in Angular:**
```typescript
// src/app/pages/dashboard/dashboard.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>
      <app-azure-spend-widget
        [soldToId]="soldToId"
        [accessToken]="accessToken"
        (widgetLoaded)="onWidgetLoaded($event)"
        (widgetError)="onWidgetError($event)"
      ></app-azure-spend-widget>
    </div>
  `
})
export class DashboardComponent {
  soldToId = 'Insight|SAP|0011035258|2400';
  accessToken = 'your-token';

  onWidgetLoaded(data: any) {
    console.log('Widget loaded:', data);
  }

  onWidgetError(error: any) {
    console.error('Widget error:', error);
  }
}
```

---

## Direct API Consumption (Advanced)

If you want to build your own UI instead of using the iframe:

```jsx
// src/hooks/useAzureSpend.js
import { useState, useEffect } from 'react';

export function useAzureSpend(soldToId, accessToken) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:8081/api/widgets/azure-spend?soldToId=${encodeURIComponent(soldToId)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const widgetData = Array.isArray(result) && result[0]?.data 
          ? result[0].data 
          : result;

        setData(widgetData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (soldToId && accessToken) {
      fetchData();
    }
  }, [soldToId, accessToken]);

  return { data, loading, error };
}
```

**Usage:**
```jsx
import { useAzureSpend } from './hooks/useAzureSpend';
import { YourCustomChart } from './components/YourCustomChart';

function CustomDashboard() {
  const { data, loading, error } = useAzureSpend(
    'Insight|SAP|0011035258|2400',
    accessToken
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Azure Spend</h2>
      <div>Current: ${data.currentEstimatedUsage}</div>
      <div>Latest: ${data.latestBilledUsage}</div>
      <YourCustomChart data={data.latestInvoiceTrend} />
    </div>
  );
}
```

---

## Testing

### React Testing Library Example
```jsx
// src/components/__tests__/AzureSpendEmbed.test.jsx
import { render, waitFor, screen } from '@testing-library/react';
import AzureSpendEmbed from '../AzureSpendEmbed';

describe('AzureSpendEmbed', () => {
  it('renders iframe with correct URL', () => {
    render(
      <AzureSpendEmbed 
        soldToId="test-id"
        accessToken="test-token"
      />
    );
    
    const iframe = screen.getByTitle('Azure Spend Widget');
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('/widgets/azure-spend');
  });

  it('sends authentication on WIDGET_READY', async () => {
    const { container } = render(
      <AzureSpendEmbed 
        soldToId="test-id"
        accessToken="test-token"
      />
    );
    
    const iframe = container.querySelector('iframe');
    const postMessageSpy = jest.spyOn(iframe.contentWindow, 'postMessage');
    
    // Simulate WIDGET_READY message
    window.postMessage(
      { type: 'WIDGET_READY' },
      window.location.origin
    );
    
    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTH_TOKEN',
          token: 'test-token',
          soldToId: 'test-id'
        }),
        expect.any(String)
      );
    });
  });
});
```

---

## Common Issues & Solutions

### Issue 1: CORS Errors
**Solution:** Ensure the widget server has proper CORS headers configured in `/api/widgets/azure-spend/route.js`

### Issue 2: postMessage Not Working
**Solution:** Verify origin validation matches exactly (including protocol and port)

### Issue 3: Widget Not Loading
**Solution:** Check Network tab in DevTools, verify widget server is running on correct port

### Issue 4: Token Not Being Sent
**Solution:** Ensure `WIDGET_READY` message is received before sending `AUTH_TOKEN`

---

## Best Practices

1. **Always validate message origins** for security
2. **Handle all widget states**: initializing, ready, loading, loaded, error
3. **Show loading indicators** for better UX
4. **Implement error boundaries** in React apps
5. **Use environment variables** for widget URLs
6. **Log widget events** for debugging
7. **Test across different browsers**
8. **Monitor widget performance**

---

## Support

For questions or issues, refer to:
- [WIDGET_ARCHITECTURE.md](../WIDGET_ARCHITECTURE.md) - Architecture details
- [WIDGET_EMBED_GUIDE.md](../WIDGET_EMBED_GUIDE.md) - Integration guide
- Widget server logs at `http://localhost:8081`

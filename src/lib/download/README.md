# Centralized Download System

A modern, centralized download functionality for Next.js 13+ that can be reused across all pages in the application.

## Architecture

```
src/lib/download/
├── downloadContext.js       # React Context for global state
├── downloadService.js       # Server Actions for API calls
├── quartzPayloadBuilder.js  # Payload builder for all download types
├── useDownload.js           # Custom hook for download operations
├── DownloadWindow.jsx       # Modal component for configuration
├── DownloadButton.jsx       # Reusable button component
├── download.css             # Styles for download components
└── index.js                 # Barrel exports
```

## Features

- ✅ Centralized state management with React Context
- ✅ Server Actions for secure API communication
- ✅ Single source of truth for Quartz payload building
- ✅ Reusable components (Button, Window)
- ✅ Support for 15+ download types
- ✅ Download history tracking
- ✅ Pending downloads indicator
- ✅ Custom date range selection
- ✅ File type selection (Excel/CSV)
- ✅ Filter-aware downloads
- ✅ Automatic state updates

## Installation

### 1. Wrap your app with DownloadProvider

In your root layout ([src/app/layout.js](src/app/layout.js)):

```jsx
import { DownloadProvider } from '@/lib/download';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DownloadProvider>
          {children}
        </DownloadProvider>
      </body>
    </html>
  );
}
```

### 2. Add DownloadWindow component

In your client layout ([src/app/ClientLayout.jsx](src/app/ClientLayout.jsx)):

```jsx
import { DownloadWindow } from '@/lib/download';

export default function ClientLayout({ children, accountInfo, t }) {
  return (
    <>
      <DownloadWindow accountInfo={accountInfo} t={t} />
      {children}
    </>
  );
}
```

### 3. Use DownloadButton in your pages

```jsx
import { DownloadButton } from '@/lib/download';

function InvoicesPage({ accountInfo }) {
  return (
    <div>
      <h1>Invoices</h1>
      <DownloadButton
        requestTypeID="Azure_Plan_Invoice"
        fileName="Azure-Invoice"
        soldToId={accountInfo.soldToID}
        invoiceMonth="202312"
      />
    </div>
  );
}
```

## Usage Examples

### Basic Download Button

```jsx
<DownloadButton
  requestTypeID="Azure_Plan_Invoice"
  fileName="Azure-Invoice"
  soldToId={accountInfo.soldToID}
  invoiceMonth="202312"
/>
```

### Download with Filters

```jsx
<DownloadButton
  requestTypeID="Azure_Plan_Consumption_Daily"
  fileName="Azure-Consumption"
  soldToId={accountInfo.soldToID}
  usageMonth="202312"
  filterState={window.location.search}
  gridTotalElements={totalRecords}
/>
```

### Custom Styled Button

```jsx
<DownloadButton
  requestTypeID="Billing_Items"
  fileName="Billing-Items"
  soldToId={accountInfo.soldToID}
  label="Export to Excel"
  themeColor="success"
  className="custom-download-btn"
/>
```

### Using the Hook Directly

For custom logic or non-button triggers:

```jsx
import { useDownload } from '@/lib/download';

function MyComponent({ accountInfo }) {
  const { scheduleDownload, isLoading } = useDownload();

  const handleExport = async () => {
    await scheduleDownload({
      requestTypeID: 'Azure_Plan_Invoice',
      fileName: 'Invoice',
      soldToId: accountInfo.soldToID,
      invoiceMonth: '202312',
      filterState: window.location.search,
    });
  };

  return (
    <button onClick={handleExport} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Export'}
    </button>
  );
}
```

## Supported Download Types

| Request Type ID | Description |
|----------------|-------------|
| `Azure_Plan_Invoice` | Azure Plan Invoice |
| `Azure_Plan_Consumption_Daily` | Azure Daily Consumption |
| `Azure_Plan_BC_Comparison` | Azure Billed vs Consumption |
| `AWS_Consumption_Daily` | AWS Daily Consumption |
| `AWS_Consumption_Summary` | AWS Consumption Summary |
| `Billing_Items` | Billing Items |
| `Billing_Items_History` | Billing Items History |
| `Legacy_Billing_Items` | Legacy Billing Items |
| `Legacy_Billing_Items_History` | Legacy Billing Items History |
| `Subscription_Detail` | Subscription Detail |
| `License_Summary_Charges` | License Summary Charges |
| `MPSA_Invoice` | MPSA Invoice |
| `MPSA_Invoice_Reconcile` | MPSA Invoice Reconciliation |
| `MPSA_Subscription` | MPSA Subscription |
| `MPSA_Subscription_History` | MPSA Subscription History |
| `MPSA_License_Detail` | MPSA License Detail |

## Props Reference

### DownloadButton Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `requestTypeID` | string | Yes | Download request type identifier |
| `fileName` | string | Yes | Base file name for download |
| `soldToId` | string | Yes | Account/Customer sold-to ID |
| `usageMonth` | string | No | Usage month (YYYYMM) |
| `invoiceMonth` | string | No | Invoice month (YYYYMM) |
| `filterState` | string | No | Query string with filters |
| `apiEndpoint` | string | No | API endpoint for data fetching |
| `gridTotalElements` | number | No | Total number of records |
| `label` | string | No | Button label (default: "Download") |
| `themeColor` | string | No | Kendo button theme (default: "primary") |
| `disabled` | boolean | No | Whether button is disabled |
| `className` | string | No | Additional CSS classes |
| `onClick` | Function | No | Additional click handler |

### DownloadWindow Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `accountInfo` | object | Yes | Account information with soldToID |
| `t` | Function | No | Translation function for i18n |

## API Structure

### scheduleDownload(config)

Opens the download window with specified configuration.

```jsx
const { scheduleDownload } = useDownload();

await scheduleDownload({
  requestTypeID: 'Azure_Plan_Invoice',
  fileName: 'Invoice',
  soldToId: '123456',
  invoiceMonth: '202312',
  filterState: '?productName=Storage&serviceName=Backup',
  gridTotalElements: 5000,
});
```

### submitDownload(params)

Submits a download request to the Quartz scheduler.

```jsx
const { submitDownload } = useDownload();

const result = await submitDownload({
  requestTypeID: 'Azure_Plan_Invoice',
  fileName: 'Invoice-123456-202312',
  soldToId: '123456',
  fileType: 'Excel',
  invoiceMonth: '202312',
  reportDateType: 'selectedmonth',
});

if (result.success) {
  console.log('Download scheduled successfully');
}
```

### refreshDownloadHistory(requestTypeID)

Refreshes the download history list.

```jsx
const { refreshDownloadHistory } = useDownload();

await refreshDownloadHistory('Azure_Plan_Invoice');
```

### checkPending(requestTypeID)

Checks for pending downloads on page load.

```jsx
const { checkPending } = useDownload();

useEffect(() => {
  checkPending('Azure_Plan_Invoice');
}, []);
```

## State Management

The download system maintains the following state:

```jsx
{
  isDownloadPopupVisible: boolean,
  downloadFileDetails: {
    requestTypeID: string,
    fileName: string,
    soldToId: string,
    usageMonth: string,
    invoiceMonth: string,
    filterState: string,
    apiEndpoint: string,
    gridTotalElements: number,
  },
  scheduledDownloads: Array,
  hasPendingDownloads: boolean,
  isLoading: boolean,
}
```

## Filter Parsing

The system automatically parses filters from query strings:

```
?productName=Storage&serviceName=Backup&customerName=Contoso
```

Extracted filters:
- `productName`: Storage
- `serviceName`: Backup
- `customerName`: Contoso

## Date Formatting

All dates are formatted as `YYYYMMDD` for API consistency:

```jsx
formatDate(new Date('2023-12-15')) // Returns: "20231215"
```

## Migration from Legacy System

### Before (Legacy)

```jsx
// Multiple files with duplicated logic
import { useRecoilState } from 'recoil';
import { downloadState } from './downloadState';

function MyComponent() {
  const [download, setDownload] = useRecoilState(downloadState);
  
  const handleDownload = () => {
    // Inline payload building
    const payload = {
      ...buildCommonPayload(),
      additionalInfo: buildAdditionalInfo(),
    };
    
    // Direct API call
    fetch('/api/download', { ... });
  };
}
```

### After (Modern)

```jsx
// Single import, centralized logic
import { DownloadButton } from '@/lib/download';

function MyComponent() {
  return (
    <DownloadButton
      requestTypeID="Azure_Plan_Invoice"
      fileName="Invoice"
      soldToId={accountInfo.soldToID}
      invoiceMonth="202312"
    />
  );
}
```

## Benefits

1. **DRY Principle**: Single source of truth for download logic
2. **Type Safety**: Consistent payload structure across all download types
3. **Maintainability**: Changes in one place affect all usages
4. **Testability**: Isolated functions easy to unit test
5. **Reusability**: Drop-in components for any page
6. **Performance**: Server Actions for optimized API calls
7. **UX**: Consistent download experience across app

## Troubleshooting

### Download button not working

Ensure DownloadProvider is wrapped around your app in the layout:

```jsx
<DownloadProvider>
  {children}
</DownloadProvider>
```

### Download window not appearing

Add DownloadWindow component to your layout:

```jsx
<DownloadWindow accountInfo={accountInfo} t={t} />
```

### Filters not being applied

Pass `filterState` as query string:

```jsx
<DownloadButton
  ...
  filterState={window.location.search}
/>
```

### API calls failing

Check that `callAPI` helper exists in your codebase:

```jsx
// Expected in src/lib/api/apiClient.js or similar
export async function callAPI(endpoint, options) { ... }
```

## Future Enhancements

- [ ] Background download progress tracking
- [ ] Email notification when download completes
- [ ] Download scheduling for specific times
- [ ] Bulk download operations
- [ ] Download templates/presets
- [ ] Download analytics and usage tracking

## License

Internal use only.

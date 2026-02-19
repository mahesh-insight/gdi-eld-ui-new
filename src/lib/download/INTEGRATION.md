# Integration Guide: Adding Download Functionality to Existing Pages

This guide shows how to integrate the centralized download system into your existing pages.

## Step 1: Update Root Layout

First, wrap your entire app with the DownloadProvider in [src/app/layout.js](src/app/layout.js):

```jsx
import { DownloadProvider } from '@/lib/download';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DownloadProvider>
          {children}
        </DownloadProvider>
      </body>
    </html>
  );
}
```

## Step 2: Add DownloadWindow to ClientLayout

Add the DownloadWindow component to [src/app/ClientLayout.jsx](src/app/ClientLayout.jsx):

```jsx
import { DownloadWindow } from '@/lib/download';

export default function ClientLayout({ children }) {
  const accountInfo = useSelector((state) => state.user.accountInfo);
  const { t } = useTranslation();

  return (
    <>
      <DownloadWindow accountInfo={accountInfo} t={t} />
      <Header />
      <main>{children}</main>
    </>
  );
}
```

## Step 3: Replace Download Buttons in Pages

### Example 1: Invoices Page

**File**: [src/app/invoices/InvoicesClientContent.jsx](src/app/invoices/InvoicesClientContent.jsx)

**Before**:
```jsx
<button onClick={handleDownload}>
  Download Invoices
</button>
```

**After**:
```jsx
import { DownloadButton } from '@/lib/download';

// In your component
<DownloadButton
  requestTypeID="Azure_Plan_Invoice"
  fileName="Azure-Invoice"
  soldToId={accountInfo.soldToID}
  invoiceMonth={selectedInvoiceMonth}
  filterState={window.location.search}
  label={t('common.download')}
/>
```

### Example 2: Azure Invoice Page

**File**: [src/app/azure-invoice/AzureInvoiceClientContent.jsx](src/app/azure-invoice/AzureInvoiceClientContent.jsx)

Replace your existing download implementation:

```jsx
import { DownloadButton } from '@/lib/download';

function AzureInvoiceClientContent() {
  const accountInfo = useSelector((state) => state.user.accountInfo);
  const { selectedMonth, selectedProvider } = useSelector((state) => state.azureInvoice);
  
  return (
    <div className="azure-invoice-page">
      <div className="header-actions">
        <DownloadButton
          requestTypeID="Azure_Plan_Consumption_Daily"
          fileName="Azure-Consumption"
          soldToId={accountInfo.soldToID}
          usageMonth={selectedMonth}
          filterState={window.location.search}
          gridTotalElements={totalRecords}
          label={t('common.download')}
          themeColor="primary"
        />
      </div>
      {/* Rest of your component */}
    </div>
  );
}
```

### Example 3: AWS Consumption Page (if exists)

```jsx
import { DownloadButton } from '@/lib/download';

function AWSConsumptionPage() {
  return (
    <div className="aws-consumption-page">
      <DownloadButton
        requestTypeID="AWS_Consumption_Daily"
        fileName="AWS-Daily-Consumption"
        soldToId={accountInfo.soldToID}
        usageMonth={selectedMonth}
        filterState={window.location.search}
      />
    </div>
  );
}
```

### Example 4: Billing Items Page

```jsx
import { DownloadButton } from '@/lib/download';

function BillingItemsPage() {
  return (
    <div className="billing-items-page">
      <DownloadButton
        requestTypeID="Billing_Items"
        fileName="Billing-Items"
        soldToId={accountInfo.soldToID}
        invoiceMonth={selectedMonth}
        filterState={window.location.search}
        gridTotalElements={gridData.length}
      />
    </div>
  );
}
```

## Step 4: Remove Legacy Download Code

Once integrated, you can safely remove:

### Files to Remove:
- Any legacy `download.js` or `downloadService.js` files
- Recoil atoms for download state (if any)
- Inline download handlers in components

### Code to Remove from Components:
```jsx
// Remove these imports
import { useRecoilState } from 'recoil';
import { downloadState } from './downloadState';

// Remove these state declarations
const [isDownloadOpen, setIsDownloadOpen] = useState(false);
const [downloadFiles, setDownloadFiles] = useState([]);

// Remove these handlers
const handleDownload = async () => {
  // Inline download logic...
};

const buildDownloadPayload = () => {
  // Inline payload building...
};
```

## Request Type Mapping

Map your existing download functionalities to request type IDs:

| Old Functionality | New requestTypeID |
|------------------|-------------------|
| Azure Invoice Download | `Azure_Plan_Invoice` |
| Azure Consumption (Daily) | `Azure_Plan_Consumption_Daily` |
| Azure Billed vs Consumption | `Azure_Plan_BC_Comparison` |
| AWS Daily Consumption | `AWS_Consumption_Daily` |
| AWS Summary Report | `AWS_Consumption_Summary` |
| Billing Items | `Billing_Items` |
| Billing History | `Billing_Items_History` |
| Legacy Billing | `Legacy_Billing_Items` |
| Subscriptions | `Subscription_Detail` |
| License Charges | `License_Summary_Charges` |
| MPSA Invoice | `MPSA_Invoice` |
| MPSA Reconciliation | `MPSA_Invoice_Reconcile` |

## Testing Checklist

After integration, test each page:

- [ ] Download button appears correctly
- [ ] Click opens download window
- [ ] File name is pre-populated correctly
- [ ] Month/date fields show correct values
- [ ] Previous downloads list loads
- [ ] Refresh button updates download list
- [ ] Submit creates download request
- [ ] Window closes on submit
- [ ] Filters are applied correctly
- [ ] Multiple download types work on same page

## Common Issues and Solutions

### Issue: DownloadWindow not opening

**Solution**: Ensure DownloadProvider wraps your app:
```jsx
// In layout.js
<DownloadProvider>
  {children}
</DownloadProvider>
```

### Issue: accountInfo undefined

**Solution**: Pass accountInfo from Redux state:
```jsx
const accountInfo = useSelector((state) => state.user.accountInfo);
<DownloadWindow accountInfo={accountInfo} t={t} />
```

### Issue: Filters not working

**Solution**: Pass current URL search params:
```jsx
<DownloadButton
  ...
  filterState={window.location.search}
/>
```

### Issue: Button shows "Loading..." indefinitely

**Solution**: Check server action responses in downloadService.js. Ensure API endpoints are correct.

### Issue: Download history not showing

**Solution**: Verify requestTypeID matches backend expectations. Check console for API errors.

## Advanced Usage

### Custom Download Button with Icon

```jsx
import { useDownload } from '@/lib/download';
import { Button } from '@progress/kendo-react-buttons';

function CustomDownloadButton() {
  const { scheduleDownload, isLoading } = useDownload();
  
  const handleClick = async () => {
    await scheduleDownload({
      requestTypeID: 'Azure_Plan_Invoice',
      fileName: 'Invoice',
      soldToId: accountInfo.soldToID,
      invoiceMonth: '202312',
    });
  };
  
  return (
    <Button
      icon="download"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : 'Export Report'}
    </Button>
  );
}
```

### Download with Custom Validation

```jsx
import { useDownload } from '@/lib/download';

function ValidatedDownload() {
  const { scheduleDownload } = useDownload();
  
  const handleDownload = async () => {
    // Custom validation
    if (selectedRecords.length === 0) {
      alert('Please select records to download');
      return;
    }
    
    if (selectedRecords.length > 1000000) {
      alert('Too many records. Please apply filters.');
      return;
    }
    
    await scheduleDownload({
      requestTypeID: 'Billing_Items',
      fileName: 'Billing-Items',
      soldToId: accountInfo.soldToID,
      gridTotalElements: selectedRecords.length,
    });
  };
  
  return <button onClick={handleDownload}>Download</button>;
}
```

### Download Button with Confirmation

```jsx
import { useDownload } from '@/lib/download';

function ConfirmDownload() {
  const { scheduleDownload } = useDownload();
  
  const handleDownload = async () => {
    const confirmed = window.confirm(
      'This will download all records. Continue?'
    );
    
    if (confirmed) {
      await scheduleDownload({
        requestTypeID: 'AWS_Consumption_Daily',
        fileName: 'AWS-Consumption',
        soldToId: accountInfo.soldToID,
        usageMonth: '202312',
      });
    }
  };
  
  return <button onClick={handleDownload}>Download All</button>;
}
```

## Next Steps

1. ✅ Integrate DownloadProvider in layout
2. ✅ Add DownloadWindow to ClientLayout
3. ✅ Replace download buttons in each page
4. ✅ Test all download functionalities
5. ✅ Remove legacy download code
6. ✅ Update documentation
7. ✅ Deploy to production

## Support

For issues or questions, consult the main [README.md](README.md) or contact the development team.

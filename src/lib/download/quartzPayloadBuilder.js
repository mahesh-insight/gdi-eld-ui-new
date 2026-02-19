/**
 * Helper function to format date as YYYYMMDD
 */
function formatDate(date) {
  if (!date) return null;
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Parse filter expression from query string
 * @param {string} raw - Raw filter string
 * @returns {Object|null} Parsed filter with key and values
 */
function parseFilterExpression(raw) {
  const decoded = decodeURIComponent(raw || '');
  
  // Handle both "equals" and "eq" operators with spaces
  let match = decoded.match(/^(.*?)\s+(?:equals|eq)\s+(.*)$/i);
  if (!match) {
    match = decoded.match(/^([^=]+)=(.*)$/);
  }
  if (!match) return null;
  
  const [, key, valuePart] = match;
  const filterKey = key.trim().toLowerCase();
  const filterValues = valuePart
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  
  return { filterKey, filterValues };
}

/**
 * Parse filter state query string and extract filter parameters
 * @param {string} filterState - Query string with filters
 * @returns {Object} Parsed filters object
 */
function parseFilters(filterState) {
  const filters = {
    productName: [],
    productCategory: [],
    skuName: [],
    accountName: [],
    serviceName: [],
    offerName: [],
    renewalPeriod: [],
    autoRenew: [],
    subscriptionId: [],
    subscriptionName: [],
    entitlementId: [],
    meterCategory: [],
    resourceGroup: [],
    tag: [],
    provider: [],
    tenantId: [],
    invoiceNumber: null,
    subscriptionStatus: null,
  };
  
  if (!filterState) return filters;
  
  const normalized = filterState.startsWith('?') ? filterState.slice(1) : filterState;
  const params = normalized.split('&');
  
  params.forEach((param) => {
    if (!param) return;
    
    const [rawKey, rawValue] = param.split('=');
    if (!rawValue) return;
    
    // Handle special non-filter parameters
    if (rawKey === 'limittenantid') {
      filters.tenantId.push(decodeURIComponent(rawValue));
      return;
    }
    
    if (rawKey === 'invoicenumber') {
      filters.invoiceNumber = decodeURIComponent(rawValue);
      return;
    }
    
    // Handle standard filter= parameters
    if (rawKey !== 'filter') return;
    
    const parsed = parseFilterExpression(rawValue);
    if (!parsed) return;
    
    const { filterKey, filterValues } = parsed;
    
    switch (filterKey) {
      case 'productname':
        filters.productName = [...filters.productName, ...filterValues];
        break;
      case 'productcategory':
        filters.productCategory = [...filters.productCategory, ...filterValues];
        break;
      case 'skuname':
        filters.skuName = [...filters.skuName, ...filterValues];
        break;
      case 'accountname':
        filters.accountName = [...filters.accountName, ...filterValues];
        break;
      case 'servicename':
        filters.serviceName = [...filters.serviceName, ...filterValues];
        break;
      case 'offername':
        filters.offerName = [...filters.offerName, ...filterValues];
        break;
      case 'renewalperiod':
        filters.renewalPeriod = [...filters.renewalPeriod, ...filterValues];
        break;
      case 'autorenew':
        filters.autoRenew = [...filters.autoRenew, ...filterValues];
        break;
      case 'subscriptionid':
        filters.subscriptionId = [...filters.subscriptionId, ...filterValues];
        break;
      case 'subscriptionname':
        filters.subscriptionName = [...filters.subscriptionName, ...filterValues];
        break;
      case 'entitlementid':
        filters.entitlementId = [...filters.entitlementId, ...filterValues];
        break;
      case 'metercategory':
        filters.meterCategory = [...filters.meterCategory, ...filterValues];
        break;
      case 'resourcegroup':
        filters.resourceGroup = [...filters.resourceGroup, ...filterValues];
        break;
      case 'tag':
        filters.tag = [...filters.tag, ...filterValues];
        break;
      case 'provider':
        filters.provider = [...filters.provider, ...filterValues];
        break;
      case 'invoicenumber':
        if (!filters.invoiceNumber) {
          filters.invoiceNumber = filterValues.join(',');
        }
        break;
      case 'status':
        if (filterValues.length > 0) {
          filters.subscriptionStatus = filterValues[0];
        }
        break;
      case 'limittenantid':
        filters.tenantId = [...filters.tenantId, ...filterValues];
        break;
      default:
        // Ignore unknown filters
    }
  });
  
  return filters;
}

/**
 * Central builder for Quartz scheduler download payloads
 * @param {Object} params - Download context parameters
 * @returns {Object} Quartz payload object
 */
export function buildQuartzPayload(params) {
  const {
    requestTypeID,
    fileName,
    soldToId,
    fileType = 'Excel',
    usageMonth,
    invoiceMonth,
    filterState,
    customStartDate,
    customEndDate,
    reportDateType,
    nestedRedirect,
    apiEndpoint,
    selectedInvoiceNumbers,
    isUnbilled = false,
  } = params;
  
  // Parse usageMonth which can be in format "YYYYMM/YYYYMM" or "YYYYMM-YYYYMM"
  let periodStart = '';
  let periodEnd = '';
  
  if (usageMonth) {
    const separator = usageMonth.includes('-') ? '-' : '/';
    [periodStart, periodEnd] = usageMonth.split(separator);
    periodEnd = periodEnd || periodStart;
  }
  
  // Parse filters from query string
  const filters = parseFilters(filterState);
  
  // Base data object
  const dataObject = {
    fileName,
    reportType: requestTypeID,
    soldToId,
    format: fileType,
    additionalInfo: {},
  };
  
  // Build additionalInfo based on requestTypeID
  switch (requestTypeID) {
    case 'Azure_Plan_Invoice_Compare':
      dataObject.additionalInfo = {
        periodStart,
        periodEnd,
        productName: filters.productName,
        productCategory: filters.productCategory,
        skuName: filters.skuName,
        serviceName: filters.serviceName,
        accountName: filters.accountName,
        ...(filters.subscriptionId.length > 0 ? { subscriptionId: filters.subscriptionId } : {}),
        ...(filters.subscriptionName.length > 0 ? { subscriptionName: filters.subscriptionName } : {}),
      };
      break;
      
    case 'Azure_Plan_Invoice': {
      const isCreditsOnly = 
        nestedRedirect === 'BillableInvoice-AzureBilledConsumptionDetail' ||
        nestedRedirect === 'AzureInvoice-AzureBilledConsumptionDetail';
      
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        productName: filters.productName,
        productCategory: filters.productCategory,
        skuName: filters.skuName,
        serviceName: filters.serviceName,
        accountName: filters.accountName,
        ...(filters.subscriptionId.length > 0 ? { subscriptionId: filters.subscriptionId } : {}),
        ...(filters.subscriptionName.length > 0 ? { subscriptionName: filters.subscriptionName } : {}),
        ...(isCreditsOnly ? { creditsOnly: true } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(filters.invoiceNumber ? { invoiceNumber: filters.invoiceNumber } : {}),
      };
      break;
    }
    
    case 'AWS_Consumption_Daily': {
      const baseInfo = {
        serviceName: filters.serviceName,
        productCategory: filters.productCategory,
        accountName: filters.accountName,
        ...(isUnbilled ? { unbilledOnly: true } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(filters.invoiceNumber ? { invoiceNumber: filters.invoiceNumber } : {}),
      };
      
      if (customStartDate && customEndDate) {
        dataObject.additionalInfo = {
          startDate: formatDate(customStartDate),
          endDate: formatDate(customEndDate),
          ...baseInfo,
        };
      } else {
        dataObject.additionalInfo = {
          yearMonth: invoiceMonth || periodStart,
          ...baseInfo,
        };
      }
      break;
    }
    
    case 'AWS_Consumption_Summary': {
      const baseInfo = {
        serviceName: filters.serviceName,
        productCategory: filters.productCategory,
        accountName: filters.accountName,
        ...(isUnbilled ? { unbilledOnly: true } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(filters.invoiceNumber ? { invoiceNumber: filters.invoiceNumber } : {}),
      };
      
      if (customStartDate && customEndDate) {
        dataObject.additionalInfo = {
          startDate: formatDate(customStartDate),
          endDate: formatDate(customEndDate),
          ...baseInfo,
        };
      } else {
        dataObject.additionalInfo = {
          yearMonth: periodStart,
          ...baseInfo,
        };
      }
      break;
    }
    
    case 'Azure_Plan_Consumption_Daily': {
      const baseInfo = {
        serviceName: filters.serviceName,
        productCategory: filters.productCategory,
        accountName: filters.accountName,
        ...(filters.entitlementId.length > 0 ? { entitlementId: filters.entitlementId } : {}),
        ...(filters.meterCategory.length > 0 ? { meterCategory: filters.meterCategory } : {}),
        ...(isUnbilled ? { unbilledOnly: true } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(filters.invoiceNumber ? { invoiceNumber: filters.invoiceNumber } : {}),
      };
      
      if (customStartDate && customEndDate) {
        dataObject.additionalInfo = {
          startDate: formatDate(customStartDate),
          endDate: formatDate(customEndDate),
          ...baseInfo,
        };
      } else {
        dataObject.additionalInfo = {
          yearMonth: invoiceMonth || periodStart,
          ...baseInfo,
        };
      }
      break;
    }
    
    case 'Azure_Plan_Consumption_Entitlement':
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        serviceName: filters.serviceName,
        productCategory: filters.productCategory,
        accountName: filters.accountName,
        ...(filters.entitlementId.length > 0 ? { entitlementId: filters.entitlementId } : {}),
        ...(isUnbilled ? { unbilledOnly: true } : {}),
      };
      break;
      
    case 'Billing_Items': {
      const provider = apiEndpoint
        ?.replace('BillableInvoiceMonthDetail', '')
        ?.toLowerCase() || 'microsoft';
      
      // Wrap soldToId in array
      dataObject.soldToId = Array.isArray(soldToId) ? soldToId : [soldToId];
      
      const additionalInfo = {
        yearMonth: periodStart,
        provider,
        productName: filters.productName,
        productCategory: filters.productCategory,
        ...(filters.subscriptionId.length > 0 ? { subscriptionId: filters.subscriptionId } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(filters.invoiceNumber ? { invoiceNumber: filters.invoiceNumber } : {}),
      };
      
      // Add report date type parameter
      if (reportDateType === 'currentyear') {
        additionalInfo.currentyear = true;
      } else if (reportDateType === 'previousyear') {
        additionalInfo.previousyear = true;
      } else {
        additionalInfo.currentmonth = true;
      }
      
      dataObject.additionalInfo = additionalInfo;
      break;
    }
    
    case 'Billing_History': {
      const provider = apiEndpoint
        ?.replace('BillableInvoiceMonthDetailHistory', '')
        ?.toLowerCase() || 'all';
      
      // Extract invoice values from selected invoice objects
      const invoiceValues = selectedInvoiceNumbers?.length > 0
        ? selectedInvoiceNumbers.map(item => item.value || item)
        : [];
      
      dataObject.additionalInfo = {
        periodStart,
        periodEnd,
        provider,
        productName: filters.productName,
        productCategory: filters.productCategory,
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
        ...(invoiceValues.length > 0 ? { invoiceNumber: invoiceValues } : {}),
      };
      break;
    }
    
    case 'Legacy_Consumption':
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
      };
      break;
      
    case 'Legacy_Invoice':
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
      };
      break;
      
    case 'Subscription':
    case 'License_Summary':
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        ...(filters.subscriptionStatus ? { status: filters.subscriptionStatus } : {}),
        serviceName: filters.serviceName,
        ...(filters.offerName.length > 0 ? { offerName: filters.offerName } : {}),
        ...(filters.renewalPeriod.length > 0 ? { renewalPeriod: filters.renewalPeriod } : {}),
        ...(filters.autoRenew.length > 0 ? { autoRenew: filters.autoRenew } : {}),
        ...(filters.tenantId.length > 0 ? { limitTenantId: filters.tenantId } : {}),
      };
      break;
      
    case 'MPSA_Summary':
    case 'MPSA_Purchases':
      dataObject.additionalInfo = {
        yearMonth: periodStart,
      };
      break;
      
    default:
      dataObject.additionalInfo = {
        yearMonth: periodStart,
        periodStart,
        periodEnd,
        productName: filters.productName,
        productCategory: filters.productCategory,
        skuName: filters.skuName,
        serviceName: filters.serviceName,
        accountName: filters.accountName,
        invoiceNumber: filters.invoiceNumber || '',
      };
      break;
  }
  
  return dataObject;
}

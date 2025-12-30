// src/common/gridColumnDefinitions.js

// Azure Invoice Details Columns
export const azureInvoiceDetailsColumns = (t) => [
  {
    field: "invoiceDate",
    title: t ? t("common.invoiceDate") : "Invoice Date",
    minWidth: 150,
    format: "{0:yyyy-MM-dd}",
  },
  {
    field: "tenantName",
    title: t ? t("common.customerName") : "Customer Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "tenantId",
    title: t ? t("common.tenantId") : "Tenant ID",
    minWidth: 250,
    format: "",
  },
  {
    field: "subscriptionID",
    title: t ? t("common.subscriptionId") : "Subscription ID",
    minWidth: 250,
    format: "",
  },
  {
    field: "subscriptionName",
    title: t ? t("common.subscriptionName") : "Subscription Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "productCategory",
    title: t ? t("common.productCategory") : "Product Category",
    minWidth: 175,
    format: "",
  },
  {
    field: "productId",
    title: t ? t("common.productId") : "Product ID",
    minWidth: 150,
    format: "",
  },
  {
    field: "productName",
    title: t ? t("common.productName") : "Product Name",
    minWidth: 250,
    format: "",
  },
  {
    field: "skuName",
    title: t ? t("common.sku") : "SKU Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "unitPrice",
    title: t ? t("common.unitPrice") : "Unit Price",
    minWidth: 125,
    format: "{0:c2}",
  },
  {
    field: "quantity",
    title: t ? t("common.quantity") : "Quantity",
    minWidth: 100,
    format: "",
  },
  {
    field: "totalForCustomer",
    title: t ? t("common.total") : "Total",
    minWidth: 125,
    format: "{0:c2}",
  },
];

// Monthly Difference Columns
export const monthlyDifferenceColumns = (t) => [
  {
    field: "startMonth",
    title: t ? t("common.startMonth") : "Start Month",
    minWidth: 150,
    format: "{0:yyyy-MM-dd}",
  },
  {
    field: "endMonth",
    title: t ? t("common.endMonth") : "End Month",
    minWidth: 150,
    format: "{0:yyyy-MM-dd}",
  },
  {
    field: "tenantName",
    title: t ? t("common.customerName") : "Customer Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "subscriptionName",
    title: t ? t("common.subscriptionName") : "Subscription Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "productCategory",
    title: t ? t("common.productCategory") : "Product Category",
    minWidth: 175,
    format: "",
  },
  {
    field: "productName",
    title: t ? t("common.productName") : "Product Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "skuName",
    title: t ? t("common.sku") : "SKU Name",
    minWidth: 200,
    format: "",
  },
  {
    field: "publisherName",
    title: t ? t("common.publisherName") : "Publisher",
    minWidth: 150,
    format: "",
  },
  {
    field: "costDifference",
    title: t ? t("common.costDifference") : "Cost Difference",
    minWidth: 150,
    format: "{0:c4}",
    cell: (props) => {
      if (typeof window === 'undefined') {
        // Server-side fallback
        return `$${props.dataItem.costDifference?.toFixed(4) || '0.0000'}`;
      }
      return (
        <td className={`cost-difference ${props.dataItem.costDifference >= 0 ? 'positive' : 'negative'}`}>
          ${props.dataItem.costDifference?.toFixed(4) || '0.0000'}
        </td>
      );
    },
  },
  {
    field: "currency",
    title: t ? t("common.currency") : "Currency",
    minWidth: 100,
    format: "",
  },
  {
    field: "changeType",
    title: t ? t("common.changeType") : "Change Type",
    minWidth: 150,
    format: "",
    cell: (props) => {
      if (typeof window === 'undefined') {
        // Server-side fallback
        return props.dataItem.changeType;
      }
      return (
        <td>
          <span className={`change-type ${props.dataItem.changeType?.toLowerCase()?.replace(' ', '-')}`}>
            {props.dataItem.changeType}
          </span>
        </td>
      );
    },
  },
];

export const microsoftBillableInvoiceColumns = (t) => [
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 150, format: "" },
  { field: "accountNumber", title: t("common.account#"), minWidth: 150, format: "" },
  { field: "poNumber", title: t("common.poNumber"), minWidth: 150, format: "" },
  { field: "companyName", title: t("common.companyName"), minWidth: 150, format: "" },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 150, format: "" },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 175, format: "" },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 150, format: "" },
  { field: "productNumber", title: t("common.productNumber"), minWidth: 150, format: "" },
  { field: "productName", title: t("common.productName"), minWidth: 300, format: "" },
  { field: "estimatedUnitPrice", title: t("common.estimateUnitPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "quantity", title: t("common.quantity"), minWidth: 100, format: "" },
  { field: "lineItemPrice", title: t("common.totalPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 150, format: "" },
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "chargeStartDate", title: t("common.chargeStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "chargeEndDate", title: t("common.chargeEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "insightSubscriptionId", title: t("common.insightSubscriptionId"), minWidth: 200, format: "" },
  { field: "billId", title: t("common.billId"), minWidth: 100, format: "" },
  { field: "billItemId", title: t("common.billItemId"), minWidth: 200, format: "" },
  { field: "billingFrequency", title: t("common.billingFrequency"), minWidth: 175, format: "" },
  { field: "billingCycle", title: t("common.billingCycle"), minWidth: 175, format: "" },
  { field: "effectiveStartDate", title: t("common.effectiveStartDate"), minWidth: 200, format: "{0:yyyy-MM-dd}" },
  { field: "commitmentEndDate", title: t("common.commitmentEndDate"), minWidth: 200, format: "{0:yyyy-MM-dd}" },
  { field: "domainName", title: t("common.domainName"), minWidth: 200, format: "" },
  { field: "contractDescription", title: t("common.contractDescription"), minWidth: 150, format: "" },
  { field: "contractNumber", title: t("common.contractNumber"), minWidth: 150, format: "" },
  { field: "promotionId", title: t("common.promotionId"), minWidth: 200, format: "" },
  { field: "promotionDiscount", title: t("common.promotionDiscount"), minWidth: 150, format: "" },
];

// AWS Billable Invoice Columns
export const awsBillableInvoiceColumns = (t) => [
  { field: "invoiceId", title: t("common.invoice#"), minWidth: 150, format: "" },
  { field: "accountId", title: t("common.account#"), minWidth: 150, format: "" },
  { field: "serviceName", title: t("common.serviceName"), minWidth: 200, format: "" },
  { field: "region", title: t("common.region"), minWidth: 150, format: "" },
  { field: "usageType", title: t("common.usageType"), minWidth: 200, format: "" },
  { field: "operation", title: t("common.operation"), minWidth: 200, format: "" },
  { field: "resourceId", title: t("common.resourceId"), minWidth: 250, format: "" },
  { field: "usageAmount", title: t("common.usageAmount"), minWidth: 150, format: "" },
  { field: "unitPrice", title: t("common.unitPrice"), minWidth: 150, format: "{0:c4}" },
  { field: "cost", title: t("common.totalPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 100, format: "" },
  { field: "usageStartDate", title: t("common.usageStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "usageEndDate", title: t("common.usageEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "tags", title: t("common.tags"), minWidth: 200, format: "" },
];

// Google Cloud Billable Invoice Columns
export const googleBillableInvoiceColumns = (t) => [
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 150, format: "" },
  { field: "projectId", title: t("common.projectId"), minWidth: 200, format: "" },
  { field: "serviceName", title: t("common.serviceName"), minWidth: 200, format: "" },
  { field: "skuDescription", title: t("common.skuDescription"), minWidth: 300, format: "" },
  { field: "location", title: t("common.location"), minWidth: 150, format: "" },
  { field: "usageAmount", title: t("common.usageAmount"), minWidth: 150, format: "" },
  { field: "usageUnit", title: t("common.usageUnit"), minWidth: 100, format: "" },
  { field: "unitPrice", title: t("common.unitPrice"), minWidth: 150, format: "{0:c4}" },
  { field: "cost", title: t("common.totalPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 100, format: "" },
  { field: "usageStartDate", title: t("common.usageStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "usageEndDate", title: t("common.usageEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}" },
  { field: "labels", title: t("common.labels"), minWidth: 200, format: "" },
];

// Dynamic column selector based on provider
export const getProviderColumns = (providerAbbreviation, t) => {
  const providerMap = {
    'microsoft': microsoftBillableInvoiceColumns,
    'aws': awsBillableInvoiceColumns,
    'google': googleBillableInvoiceColumns,
    'gcp': googleBillableInvoiceColumns, // Alias for Google Cloud Platform
  };
  
  const columnFunction = providerMap[providerAbbreviation?.toLowerCase()] || microsoftBillableInvoiceColumns;
  return columnFunction(t);
};

// Grid Functions utility
export const GridFunctions = () => {
  const setInitialColumnWidth = () => {
    // Implementation for setting initial column width
  };

  const setWidth = (minWidth) => {
    return minWidth || 150;
  };

  return { setInitialColumnWidth, setWidth };
};
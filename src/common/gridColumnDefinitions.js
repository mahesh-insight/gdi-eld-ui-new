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
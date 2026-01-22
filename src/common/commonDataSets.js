const activeSubscriptionDashletColumns = (t) => [
  { field: "productName", title: t("common.productName"), minWidth: 400, },
  { field: "productType", title: t("common.productType"), minWidth: 150, },
  { field: "subscriptionID", title: t("common.subscriptionID"), minWidth: 300, },
  { field: "anniversaryDate", title: t("common.anniversaryDate"), minWidth: 175, },
  { field: "quantity", title: t("common.currentQty"), minWidth: 140, },
  { field: "billingTerm", title: t("common.billingTerm"), minWidth: 140, },
  { field: "billingFrequency", title: t("common.billingFrequency"), minWidth: 175, },
];

const billableItemsColumns = (t) => [
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 175, },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 175, },
  { field: "poNumber", title: t("common.poNumber"), minWidth: 300, },
  { field: "accountName", title: t("common.accountName"), minWidth: 250, },
  { field: "insightSubscriptionID", title: t("common.insightSubscriptionId"), minWidth: 200, },
  { field: "offerName", title: t("common.productName"), minWidth: 140, },
  { field: "lineItemCost", title: t("common.pricePerUnit"), minWidth: 175, },
  { field: "lineItemQty", title: t("common.quantity"), minWidth: 175, },
  { field: "lineItemPrice", title: t("common.totalPrice"), minWidth: 175, },
  { field: "currency", title: t("common.currency"), minWidth: 175, },
  { field: "chargeStartDate", title: t("common.chargeStartDate"), minWidth: 175, },
  { field: "chargeEndDate", title: t("common.chargeEndDate"), minWidth: 175, },
  { field: "microsoftProductSKU", title: t("common.product#"), minWidth: 175, },
  { field: "resellerMPNID", title: t("common.mpnId"), minWidth: 175, },
  { field: "tenantID", title: t("common.tenantId"), minWidth: 175, },
  { field: "subscriptionID", title: t("common.subscriptionID"), minWidth: 300, },
  { field: "billID", title: t("common.billId"), minWidth: 175, },
  { field: "billItemID", title: t("common.billItemId"), minWidth: 175, },
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 175, },
  { field: "billingFrequency", title: t("common.billingFrequency"), minWidth: 175, },
  { field: "billingTerm", title: t("common.billingTerm"), minWidth: 175, },
  { field: "subscriptionStartDate", title: t("common.subscriptionStartDate"), minWidth: 175, },
  { field: "subscriptionEndDate", title: t("common.subscriptionEndDate"), minWidth: 175, },
  { field: "promotionID", title: t("common.promotionId"), minWidth: 175, },
  { field: "promotionDiscount", title: t("common.promotionDiscount"), minWidth: 175, },
  { field: "productType", title: t("common.productType"), minWidth: 175, },
];

const azureInvoiceColumns = (t) => [
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 150, format: "{0:yyyy-MM-dd}", },
  { field: "tenantName", title: t("common.customerName"), minWidth: 300, format: "", },
  { field: "customerTenantId", title: t("common.tenantId"), minWidth: 300, format: "", },
  { field: "subscriptionID", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "subscriptionName", title: t("common.subscriptionName"), minWidth: 300, format: "", },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 175, format: "", },
  { field: "productId", title: t("common.productId"), minWidth: 150, format: "", },
  { field: "productName", title: t("common.productName"), minWidth: 300, format: "", },
  { field: "skuName", title: t("common.sku"), minWidth: 300, format: "", },
  { field: "skuId", title: t("common.skuId"), minWidth: 150, format: "", },
  { field: "orderDate", title: t("common.orderDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "publisherId", title: t("common.publisherId"), minWidth: 150, format: "", },
  { field: "publisherName", title: t("common.publisherName"), minWidth: 250, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 100, format: "", },
  { field: "billableQuantity", title: t("common.billableQuantity"), minWidth: 175, format: "", },
  { field: "unitType", title: t("common.unitType"), minWidth: 125, format: "{0:c2}", },
  { field: "chargeStartDate", title: t("common.chargeStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "chargeEndDate", title: t("common.chargeEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "subTotal", title: t("common.subTotal"), minWidth: 125, format: "{0:c2}", },
  { field: "taxTotal", title: t("common.tax"), minWidth: 125, format: "{0:c2}", },
  { field: "totalForCustomer", title: t("common.total"), minWidth: 125, format: "{0:c2}", },
  { field: "currency", title: t("common.currency"), minWidth: 100, format: "", },
  { field: "subscriptionStartDate", title: t("common.subscriptionStartDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "subscriptionEndDate", title: t("common.subscriptionEndDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "chargeType", title: t("common.chargeType"), minWidth: 140, format: "", },
  { field: "termAndBillingCycle", title: t("common.billingCycle"), minWidth: 200, format: "", },
  { field: "domainName", title: t("common.domain"), minWidth: 300, format: "", },
  { field: "customerCountry", title: t("common.country"), minWidth: 125, },
];

const azureInvoiceMonthlyDifferenceColumns = (t) => [
  { field: "tenantName", title: t("common.customerName"), minWidth: 150, },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 150, },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 150, },
  { field: "subscriptionName", title: t("common.subscriptionName"), minWidth: 150, },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 150, },
  { field: "productId", title: t("common.productId"), minWidth: 150, },
  { field: "productName", title: t("common.productName"), minWidth: 150, },
  { field: "skuId", title: t("common.skuId"), minWidth: 150, },
  { field: "skuName", title: t("common.skuName"), minWidth: 150, },
  { field: "publisherName", title: t("common.publisherName"), minWidth: 150, },
  { field: "costDifference", title: t("common.costDifference"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 150, },
  { field: "changeType", title: t("common.changeType"), minWidth: 150, },
];

const legacyInvoiceColumns = (t) => [
  { field: "tenantId", title: t("common.tenantId"), minWidth: 150, format: "", },
  { field: "companyName", title: t("common.companyName"), minWidth: 300, format: "", },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "subscriptionName", title: t("common.subscriptionName"), minWidth: 300, format: "", },
  { field: "ServiceName", title: t("common.serviceName"), minWidth: 200, format: "", },
  { field: "serviceType", title: t("common.serviceType"), minWidth: 175, format: "", },
  { field: "region", title: t("common.region"), minWidth: 150, format: "", },
  { field: "unit", title: t("common.unit"), minWidth: 300, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "", },
  { field: "totalCost", title: t("common.totalCost"), minWidth: 175, format: "{0:c2}", },
  { field: "currency", title: t("common.currency"), minWidth: 150, format: "", },
  { field: "country", title: t("common.country"), minWidth: 150, format: "", },
  { field: "chargeStartDate", title: t("common.chargeStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "chargeEndDate", title: t("common.chargeEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "resourceName", title: t("common.resourceName"), minWidth: 125, format: "", }
];

const legacyConsumptionColumns = (t) => [
  { field: "tenantId", title: t("common.tenantId"), minWidth: 150, format: "", },
  { field: "companyName", title: t("common.companyName"), minWidth: 300, format: "", },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "subscriptionName", title: t("common.subscriptionName"), minWidth: 300, format: "", },
  { field: "resourceGroup", title: t("common.resourceGroup"), minWidth: 300, format: "", },
  { field: "category", title: t("common.productName"), minWidth: 200, format: "", },
  { field: "subCategory", title: t("common.subcategory"), minWidth: 175, format: "", },
  { field: "resourceName", title: t("common.resourceName"), minWidth: 150, format: "", },
  { field: "machineName", title: t("common.machine"), minWidth: 150, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "", },
  { field: "rateTotal", title: t("common.total"), minWidth: 175, format: "", },
  { field: "unit", title: t("common.unit"), minWidth: 150, format: "", },
  { field: "curency", title: t("common.currency"), minWidth: 150, format: "", },
  { field: "startTime", title: t("common.startTime"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "endTime", title: t("common.endTime"), minWidth: 175, format: "{0:yyyy-MM-dd}", }
];

const azureDailyConsumptionColumns = (t) => [
  { field: "entitlementDescription", title: t("common.azureSubscriptionName"), minWidth: 300, format: "", },
  { field: "entitlementId", title: t("common.azureSubscriptionId"), minWidth: 300, format: "", },
  { field: "meterCategory", title: t("common.serviceName"), minWidth: 200, format: "", },
  { field: "chargeStartDate", title: t("common.chargeStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "chargeEndDate", title: t("common.chargeEndDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "usageDate", title: t("common.usageDate"), minWidth: 140, format: "{0:yyyy-MM-dd}", },
  { field: "productName", title: t("common.productName"), minWidth: 300, format: "", },
  { field: "skuName", title: t("common.sku"), minWidth: 300, format: "", },
  { field: "skuId", title: t("common.skuId"), minWidth: 150, format: "", },
  { field: "publisherName", title: t("common.publisherName"), minWidth: 200, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 125, format: "", },
  { field: "billingCurrency", title: t("common.billingCurrency"), minWidth: 140, format: "", },
  { field: "pricingCurrency", title: t("common.pricingCurrency"), minWidth: 140, format: "", },
  { field: "billingPreTaxTotal", title: t("common.billingPreTax"), minWidth: 175, format: "{0:c2}", },
  { field: "pricingPreTaxTotal", title: t("common.pricingPreTax"), minWidth: 175, format: "{0:c2}", },
  { field: "unitPrice", title: t("common.unitPrice"), minWidth: 140, format: "{0:c2}", },
  { field: "effectiveUnitPrice", title: t("common.effectiveUnitPrice"), minWidth: 175, format: "{0:c2}", },
  { field: "consumedService", title: t("common.consumedService"), minWidth: 200, format: "", },
  { field: "meterType", title: t("common.meterType"), minWidth: 200, format: "", },
  { field: "meterName", title: t("common.meterName"), minWidth: 250, format: "", },
  { field: "meterRegion", title: t("common.meterRegion"), minWidth: 140, format: "", },
  { field: "meterSubCategory", title: t("common.meterSubCategory"), minWidth: 200, format: "", },
  { field: "unitOfMeasure", title: t("common.unitOfMeasure"), minWidth: 150, format: "", },
  { field: "resourceGroup", title: t("common.resourceGroup"), minWidth: 200, format: "", },
  { field: "resourceLocation", title: t("common.resourceLocation"), minWidth: 175, format: "", },
  { field: "resourceName", title: t("common.resourceName"), minWidth: 175, format: "", },
  { field: "customerCountry", title: t("common.country"), minWidth: 125, format: "", },
  { field: "serviceInfo1", title: t("common.serviceInfo1"), minWidth: 200, format: "", },
  { field: "serviceInfo2", title: t("common.serviceInfo2"), minWidth: 200, format: "", },
];

const awsUnbilledDailyConsumptionColumns = (t) => [
  { field: "accountName", title: t("common.awsAccountName"), minWidth: 300, format: "", },
  { field: "accountNumber", title: t("common.awsAccountNumber"), minWidth: 300, format: "", },
  { field: "payerAccountNumber", title: t("common.payerAccountNumber"), minWidth: 200, format: "", },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 175, format: "", },
  { field: "service", title: t("common.serviceName"), minWidth: 175, format: "", },
  { field: "usageDate", title: t("common.usageDate"), minWidth: 140, format: "{0:yyyy-MM-dd}", },
  { field: "description", title: t("common.description"), minWidth: 300, format: "", },
  { field: "usageType", title: t("common.usageType"), minWidth: 300, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "", },
  { field: "price", title: t("common.price"), minWidth: 200, format: "{0:c2}"},
  { field: "reservedInstance", title: t("common.reservedInstance"), minWidth: 125, format: "", },
  { field: "availabilityZone", title: t("common.availabilityZone"), minWidth: 140, format: "", },
  { field: "currency", title: t("common.currency"), minWidth: 200, format: "", },
];

const awsDailyConsumptionColumns = (t) => [
  { field: "accountName", title: t("common.awsAccountName"), minWidth: 300, format: "", },
  { field: "accountNumber", title: t("common.awsAccountNumber"), minWidth: 300, format: "", },
  { field: "payerAccountNumber", title: t("common.payerAccountNumber"), minWidth: 200, format: "", },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 175, format: "", },
  { field: "service", title: t("common.serviceName"), minWidth: 175, format: "", },
  { field: "usageDate", title: t("common.usageDate"), minWidth: 140, format: "{0:yyyy-MM-dd}", },
  { field: "description", title: t("common.description"), minWidth: 300, format: "", },
  { field: "usageType", title: t("common.usageType"), minWidth: 300, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "", },
  { field: "price", title: t("common.price"), minWidth: 200, format: "{0:c2}" },
  { field: "reservedInstance", title: t("common.reservedInstance"), minWidth: 125, format: "", },
  { field: "availabilityZone", title: t("common.availabilityZone"), minWidth: 140, format: "", },
  { field: "currency", title: t("common.currency"), minWidth: 140, format: "", },
];

const awsSummaryColumns = (t) => [
  { field: "accountName", title: t("common.awsAccountName"), minWidth: 300, format: "", },
  { field: "accountNumber", title: t("common.awsAccountNumber"), minWidth: 300, format: "", },
  { field: "payerAccountNumber", title: t("common.payerAccountNumber"), minWidth: 200, format: "", },
  { field: "usageMonth", title: t("common.usageMonth"), minWidth: 140, format: "", },
  { field: "billingPreTaxTotal", title: t("common.total"), minWidth: 140, format: "{0:c2}", },
];

const azureEntitlementSummaryColumns = (t) => [
  { field: "entitlementDescription", title: t("common.azureSubscriptionName"), minWidth: 300, format: "", },
  { field: "entitlementId", title: t("common.azureSubscriptionId"), minWidth: 300, format: "", },
  { field: "billingPreTaxTotal", title: t("common.total"), minWidth: 175, format: "{0:c2}", },
  { field: "subscriptionDescription", title: t("common.subscriptionName"), minWidth: 300, format: "", },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "tenantName", title: t("common.customerName"), minWidth: 300, format: "", },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 300, format: "", },
  { field: "usageMonth", title: t("common.usageMonth"), minWidth: 200, format: "", },
];

const azureSubscriptionsColumns = (t) => [
  { field: "offerName", title: t("common.productName"), minWidth: 300, format: "", },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "quantity", title: t("common.currentQuantity"), minWidth: 150, format: "", },
  { field: "currentUnitPrice", title: t("common.currentUnitPrice"), minWidth: 175, format: "{0:c2}", },
  { field: "commitmentEndDate", title: t("common.anniversaryDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "autoRenewEnabled", title: t("common.autoRenew"), minWidth: 75, format: "", },
  { field: "termDuration", title: t("common.commitmentPeriod"), minWidth: 150, format: "", },
  { field: "billingType", title: t("common.billingType"), minWidth: 175, format: "", },
  { field: "billingCycle", title: t("common.billingFrequency"), minWidth: 150, format: "", },
  { field: "offerID", title: t("common.offerId"), minWidth: 300, format: "", },
  { field: "friendlyName", title: t("common.subscriptionName"), minWidth: 300, format: "", },
  { field: "effectiveStartDate", title: t("common.effectiveStartDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "cancellationAllowedUntilDate", title: t("common.cancellationAllowedUntil"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "isNce", title: t("common.nceLicense"), minWidth: 175, },
  { field: "tenantName", title: t("common.customerName"), minWidth: 250, format: "", },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 300, format: "", },
  { field: "status", title: t("common.status"), minWidth: 150, format: "", },
  { field: "contractDescription", title: t("common.contractDescription"), minWidth: 150, format: "", },
  { field: "contractNumber", title: t("common.contractNumber"), minWidth: 150, format: "", },
];

const azureSubscriptionsLicenseColumns = (t) => [
  { field: "offerName", title: t("common.productName"), minWidth: 300, format: "", },
  { field: "offerID", title: t("common.offerId"), minWidth: 300, format: "", },
  { field: "licenseQuantity", title: t("common.licenseQuantity"), minWidth: 300, format: "", },
  { field: "subscriptionQuantity", title: t("common.subscriptionQuantity"), minWidth: 150, format: "", },
  { field: "status", title: t("common.subscriptionStatus"), minWidth: 175, format: "", },
  { field: "tenantID", title: t("common.tenantId"), minWidth: 150, format: "", },
  { field: "tenantName", title: t("common.customerName"), minWidth: 300, format: "", }
];

const azureSubscriptionsHistoryColumns = (t) => [
  { field: "offerName", title: t("common.productName"), minWidth: 200, format: "", },
  { field: "friendlyName", title: t("common.subscriptionName"), minWidth: 200, format: "", },
  { field: "productType", title: t("common.productType"), minWidth: 175, format: "", },
  { field: "subscriptionID", title: t("common.subscriptionID"), minWidth: 300, format: "", },
  { field: "anniversaryDate", title: t("common.anniversaryDate"), minWidth: 175, format: "{0:yyyy-MM-dd}", },
  { field: "changeDate", title: t("common.changeDate"), minWidth: 175, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "", },
];

const myAccountSearchAdminColumns = (t) => [
  { field: "soldToName", title: t("common.accountName"), minWidth: 200, format: "", },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 100, format: "", },
  { field: "ggpName", title: t("common.ggpName"), minWidth: 200, format: "", },
  { field: "ggp", title: t("common.ggp"), minWidth: 100, format: "", },
  { field: "salesOrganizationCode", title: t("common.salesOrg"), minWidth: 75, format: "", },
  { field: "salesOrganizationName", title: t("common.salesOrgName"), minWidth: 150, format: "", },
];

const accountSearchAdminColumns = (t) => [
  {
    field: "",
    title: "",
    minWidth: 150,
    isAction: true,
  },
  { field: "soldToName", title: t("common.accountName"), minWidth: 200 },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 100 },
  { field: "ggpName", title: t("common.ggpName"), minWidth: 200 },
  { field: "ggp", title: t("common.ggp"), minWidth: 100 },
  { field: "salesOrganizationCode", title: t("common.salesOrg"), minWidth: 75 },
  { field: "salesOrganizationName", title: t("common.salesOrgName"), minWidth: 150 },
];


const accountSearchUserColumns = (t) => [
  { field: "soldToName", title: t("common.accountName"), minWidth: 200, format: "", },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 200, format: "", },
];

const downloadColumns = (t) => [
  { field: "fileName", title: t("common.fileName"), minWidth: 200, format: "", },
  { field: "created", title: t("common.scheduledDateUtc"), minWidth: 110, format: "{0:yyyy-MM-dd HH:mm:ss}", },
  { field: "processTimespan", title: t("common.processTimespan"), minWidth: 50, format: "", },
  { field: "fileSize", title: t("common.fileSize"), minWidth: 50, format: "", },
];

const microsoftBillableInvoiceColumns = (t) => [
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

const awsBillableInvoiceColumns = (t) => [
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 150, format: "" },
  { field: "soldTo", title: t("common.account#"), minWidth: 150, format: "" },
  { field: "soldToName", title: t("common.companyName"), minWidth: 150, format: "" },
  { field: "customerPO", title: t("common.poNumber"), minWidth: 150, format: "" },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 150, format: "" },
  { field: "partNumber", title: t("common.partNumber"), minWidth: 150, format: "" },
  { field: "partDescription", title: t("common.productName"), minWidth: 150, format: "" },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "" },
  { field: "total", title: t("common.totalPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 150, format: "" },
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "coverageStartDate", title: t("common.chargeStartDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "coverageEndDate", title: t("common.chargeEndDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "invoiceNumber", title: t("common.invoiceNumber"), minWidth: 150, format: "" },
  { field: "invoiceItem", title: t("common.invoiceItem"), minWidth: 150, format: "" },
  { field: "orderNumber", title: t("common.orderNumber"), minWidth: 150, format: "" },
];

const adobeBillableInvoiceColumns = (t) => [
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 150, format: "" },
  { field: "soldTo", title: t("common.account#"), minWidth: 150, format: "" },
  { field: "soldToName", title: t("common.companyName"), minWidth: 150, format: "" },
  { field: "customerPO", title: t("common.poNumber"), minWidth: 150, format: "" },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 150, format: "" },
  { field: "partNumber", title: t("common.partNumber"), minWidth: 150, format: "" },
  { field: "partDescription", title: t("common.productName"), minWidth: 150, format: "" },
  { field: "quantity", title: t("common.quantity"), minWidth: 150, format: "" },
  { field: "total", title: t("common.totalPrice"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 150, format: "" },
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "coverageStartDate", title: t("common.chargeStartDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "coverageEndDate", title: t("common.chargeEndDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "invoiceNumber", title: t("common.invoiceNumber"), minWidth: 150, format: "" },
  { field: "invoiceItem", title: t("common.invoiceItem"), minWidth: 150, format: "" },
  { field: "orderNumber", title: t("common.orderNumber"), minWidth: 150, format: "" },
];

const billableInvoiceHistoryColumns = (t) => [
  { field: "provider", title: t("common.provider"), minWidth: 150, format: "" },
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "invoiceNumber", title: t("common.invoiceNumber"), minWidth: 150, format: "" },
  { field: "subTotal", title: t("common.subTotal"), minWidth: 150, format: "{0:c2}" },
  { field: "taxTotal", title: t("common.taxTotal"), minWidth: 150, format: "{0:c2}" },
  { field: "grandTotal", title: t("common.invoiceTotal"), minWidth: 150, format: "{0:c2}" },
  { field: "currency", title: t("common.currency"), minWidth: 150, format: "" },
  { field: "invoiceDueDate", title: t("common.invoiceDueDate"), minWidth: 150, format: "{0:yyyy-MM-dd}" },
  { field: "invoiceStatus", title: t("common.invoiceStatus"), minWidth: 100, format: "" },
];

const mappedSoldTosColumns = (t) => [
  { field: "soldToName", title: t("common.accountName"), minWidth: 200, format: "", },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 200, format: "", },
  { field: "ggpName", title: t("common.ggpName"), minWidth: 200, format: "", },
  { field: "ggp", title: t("common.ggp"), minWidth: 200, format: "", },
  { field: "salesOrganizationCode", title: t("common.salesOrg"), minWidth: 200, format: "", },
  { field: "salesOrganizationName", title: t("common.salesOrgName"), minWidth: 200, format: "", },
];

const assignedRepsColumns = (t) => [
  { field: "employeeName", title: t("common.repName"), minWidth: 180 },
  { field: "positionName", title: t("common.title"), minWidth: 150 },
  { field: "countryCode", title: t("common.country"), minWidth: 90 },
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 120 },
  { field: "soldToName", title: t("common.accountName"), minWidth: 220 },
];

const clientDataCSPTenants = (t) => [
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 180 },
  { field: "companyName", title: t("common.customerName"), minWidth: 180 },
  { field: "tenantID", title: t("common.tenantId"), minWidth: 90 },
  { field: "domain", title: t("common.domain"), minWidth: 120 },
  { field: "resellerName", title: t("common.resellerName"), minWidth: 220 },
  { field: "partnerCenterID", title: t("common.partnerCenter"), minWidth: 220 },
];

const cspTenantsColumns = (t) => [
  { field: "soldTo", title: t("common.accountNumber"), minWidth: 150, format: "", },
  { field: "tenantName", title: t("common.customerName"), minWidth: 200, format: "", },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 200, format: "", },
  { field: "domainName", title: t("common.domainName"), minWidth: 200, format: "", },
  { field: "resellerName", title: t("common.resellerName"), minWidth: 200, format: "", },
];

const cspMarkupColumns = (t) => [
  { field: "tenantName", title: t("common.tenantName"), minWidth: 200, format: "", },
  { field: "tenantId", title: t("common.tenantId"), minWidth: 200, format: "", },
  { field: "resellerName", title: t("common.resellerName"), minWidth: 200, format: "", },
  { field: "productCategory", title: t("common.productCategory"), minWidth: 200, format: "", },
  { field: "markupValue", title: t("common.markupValue"), minWidth: 200, format: '{0:n3}' },
];

const cspMarkupHistoryColumns = (t) => [
  { field: "productCategory", title: t("common.productCategory"), minWidth: 150, format: "" },
  { field: "subscriptionId", title: t("common.subscriptionID"), minWidth: 350, format: "" },
  { field: "offerName", title: t("common.offerName"), minWidth: 150, format: "" }
];

const MPSALicenseColumns = (t) => [
  { field: "productName", title: t("common.productName"), minWidth: 500, format: "", },
  { field: "partNumber", title: t("common.part#"), minWidth: 200, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 200, format: "", },
  { field: "productType", title: t("common.productType"), minWidth: 200, format: "", },
  { field: "coverageEndDate", title: t("common.coverageEndDate"), minWidth: 300, format: "{0:yyyy-MM-dd}", },
];

const MPSAPurchaseColumns = (t) => [
  { field: "invoiceDate", title: t("common.invoiceDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "invoiceNumber", title: t("common.invoice#"), minWidth: 200, format: "", },
  { field: "agreementNumber", title: t("common.agreement#"), minWidth: 200, format: "", },
  { field: "partNumber", title: t("common.part#"), minWidth: 200, format: "", },
  { field: "productName", title: t("common.productName"), minWidth: 200, format: "", },
  { field: "quantity", title: t("common.quantity"), minWidth: 100, format: "", },
  { field: "price", title: t("common.price"), minWidth: 100, format: "", },
  { field: "currency", title: t("common.currency"), minWidth: 100, format: "", },
  { field: "productType", title: t("common.productType"), minWidth: 150, format: "", },
  { field: "coverageStartDate", title: t("common.coverageStartDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "coverageEndDate", title: t("common.coverageEndDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "customerPO", title: t("common.customerPO"), minWidth: 150, format: "", },
  { field: "accountNumber", title: t("common.account#"), minWidth: 200, format: "", },
  { field: "accountName", title: t("common.accountName"), minWidth: 200, format: "", }
];

const cspDataStatusColumns = (t) => [
  { field: "partnerCenterDescription", title: t("common.partnerCenterName"), minWidth: 300, format: "", },
  { field: "partnerCenterDomain", title: t("common.partnerCenterDomain"), minWidth: 300, format: "", },
  { field: "latestInvoiceOneTimeInvoice", title: t("common.lastInvoiceNumber"), minWidth: 150, format: "", },
  { field: "latestInvoiceOneTimeDate", title: t("common.lastInvoiceDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "latestBilledConsumptionDate", title: t("common.lastBilledConsumptionDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", },
  { field: "latestUnbilledConsumptionDate", title: t("common.lastDailyConsumptionDate"), minWidth: 200, format: "{0:yyyy-MM-dd}", }
];

export {
  activeSubscriptionDashletColumns,
  billableItemsColumns,
  azureInvoiceColumns,
  azureInvoiceMonthlyDifferenceColumns,
  legacyInvoiceColumns,
  legacyConsumptionColumns,
  azureDailyConsumptionColumns,
  awsDailyConsumptionColumns,
  awsUnbilledDailyConsumptionColumns,
  awsSummaryColumns,
  azureEntitlementSummaryColumns,
  azureSubscriptionsColumns,
  azureSubscriptionsLicenseColumns,
  azureSubscriptionsHistoryColumns,
  myAccountSearchAdminColumns,
  accountSearchAdminColumns,
  accountSearchUserColumns,
  downloadColumns,
  microsoftBillableInvoiceColumns,
  awsBillableInvoiceColumns,
  adobeBillableInvoiceColumns,
  billableInvoiceHistoryColumns,
  mappedSoldTosColumns,
  assignedRepsColumns,
  clientDataCSPTenants,
  cspTenantsColumns,
  cspMarkupColumns,
  cspMarkupHistoryColumns,
  MPSALicenseColumns,
  MPSAPurchaseColumns,
  cspDataStatusColumns
};
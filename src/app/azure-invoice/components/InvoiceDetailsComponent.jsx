// src/app/azure-invoice/components/InvoiceDetailsComponent.jsx
"use client";

import { useState } from 'react';
import { Skeleton } from '@progress/kendo-react-indicators';
import GridTable from '@/components/GridTable/GridTable';
import { ProductsLoader } from '@/components/ProductsLoader/ProductsLoader';
import { azureInvoiceDetailsColumns, GridFunctions } from '@/common/gridColumnDefinitions';

const InvoiceDetailsComponent = ({ usageMonth, data, isLoading }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const { setWidth } = GridFunctions();
  
  // Column definitions
  const columns = azureInvoiceDetailsColumns();

  // Data state for grid
  const [dataState, setDataState] = useState({
    page: page,
    take: 20,
    skip: 0,
  });

  // Products state  
  const [products, setProducts] = useState({
    data: Array.isArray(data) ? data : [],
    total: Array.isArray(data) ? data.length : 0,
  });

  // Handle grid data state changes (pagination, sorting, etc.) - similar to your existing pattern
  const dataStateChange = (e) => {
    setDataState(e.dataState);
    setPage(e.dataState.skip / e.dataState.take);
    setPageSize(e.dataState.take);
  };

  // Handle data received from ProductsLoader
  const dataReceived = (products) => {
    setProducts(products);
  };

  return (
    <div className="billable_item_grid">
      {isLoading ? (
        <Skeleton shape="rectangle" className="azure-invoice-skeleton-table" />
      ) : (
        <>
          <GridTable
            name="azureInvoiceDetails"
            columns={columns}
            filterable={true}
            sortable={true}
            pageable={true}
            dataState={dataState}
            data={products}
            gridData={data}
            page={page}
            pageSize={pageSize}
            dataStateChange={dataStateChange}
            setWidth={setWidth}
          />
          
           <ProductsLoader
            name="azureInvoiceDetailsTabs"
            page={page}
            pageSize={pageSize}
            callType="post"
            requestTypeID="Azure_Plan_Invoice_Details"
            apiEndPoint="invoiceMonthDetail"
            usageMonth={usageMonth}
            dataState={dataState}
            onDataReceived={dataReceived}
          />
        </>
      )}
    </div>
  );
};

export default InvoiceDetailsComponent;
// src/app/azure-invoice/components/MonthlyDifferenceComponent.jsx
"use client";

import { useState } from 'react';
import { Skeleton } from '@progress/kendo-react-indicators';
import GridTable from '@/components/GridTable/GridTable';
import { ProductsLoader } from '@/components/ProductsLoader/ProductsLoader';
import { monthlyDifferenceColumns, GridFunctions } from '@/common/gridColumnDefinitions';

const MonthlyDifferenceComponent = ({ usageMonth, data, isLoading }) => {
    console.log('MonthlyDifferenceComponent data:', data);
    console.log('MonthlyDifferenceComponent data length:', data?.length);
    console.log('MonthlyDifferenceComponent isArray:', Array.isArray(data));
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const { setWidth } = GridFunctions();
  
  // Column definitions
  const columns = monthlyDifferenceColumns();

  // Data state for grid
  const [dataState, setDataState] = useState({
    page: page,
    take: 20,
    skip: 0,
  });

  // Products state - use data from parent directly
  const products = {
    data: Array.isArray(data) ? data : [],
    total: Array.isArray(data) ? data.length : 0,
  };
  

  // Handle grid data state changes (pagination, sorting, etc.)
  const dataStateChange = (e) => {
    setDataState(e.dataState);
    setPage(e.dataState.skip / e.dataState.take);
    setPageSize(e.dataState.take);
  };

  return (
    <div className="billable_item_grid">
      {isLoading ? (
        <Skeleton shape="rectangle" className="azure-invoice-skeleton-table" />
      ) : (
        <GridTable
          name="azureMonthlyDifference"
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
          gridHeight="450px"
        />
      )}
    </div>
  );
};

export default MonthlyDifferenceComponent;
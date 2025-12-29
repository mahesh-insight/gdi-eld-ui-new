// src/components/GridTable/GridTable.jsx
"use client";

import React from 'react';
import { Grid, GridColumn } from '@progress/kendo-react-grid';

const GridTable = (props) => {
  const {
    data,
    gridData,
    sortable = true,
    filterable = false,
    pageable = true,
    gridSort,
    page,
    pageSize,
    columns,
    tenantId,
    setWidth,
    name,
    dataState,
    dataStateChange,
    enableToolbar = false,
    gridHeight = "450px",
    defaultTake = 20,
    pageSizes = [20, 50, 100],
    buttonCount = 4,
  } = props;

  // Use the existing data structure
  const gridDataToUse = data || { data: [], total: 0 };

  // Ensure proper initial pagination state
  const initialDataState = dataState || { skip: 0, take: defaultTake };

  return (
    <div className="grid-table-wrapper">
      <Grid
        style={{ 
          height: gridHeight,
        }}
        name={'name'}
        data={gridDataToUse}
        sortable={sortable}
        filterable={filterable}
        skip={initialDataState.skip || 0}
        take={initialDataState.take || defaultTake}
        total={gridDataToUse.total || (Array.isArray(gridDataToUse) ? gridDataToUse.length : gridDataToUse.data?.length || 0)}
        page={page}
        onDataStateChange={dataStateChange}
        pageable={{
            buttonCount: 4,
            pageSizes: [20, 50, 100],
            pageSize: defaultTake,
            pageSizeValue: defaultTake
        }}
        sort={gridSort}
      >
        {columns?.map((column, index) => (
          <GridColumn
            key={index}
            field={column.field}
            title={column.title}
            width={setWidth ? setWidth(column.minWidth) : column.minWidth}
            format={column.format}
            cell={column.cell}
          />
        ))}
      </Grid>
    </div>
  );
};

export default GridTable;
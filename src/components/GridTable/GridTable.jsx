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
    buttonCount = 5,
  } = props;

  // Use the existing data structure
  const gridDataToUse = data || { data: [], total: 0 };

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
        {...dataState}
        page={page}
        onDataStateChange={dataStateChange}
        pageable={{
            buttonCount: 4,
            pageSizes: [20, 50, 100]
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
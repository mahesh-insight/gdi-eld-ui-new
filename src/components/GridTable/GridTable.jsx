// src/components/GridTable/GridTable.jsx
"use client";

import React from 'react';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Loader } from '@progress/kendo-react-indicators';

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
    loading = false,
  } = props;

  // Use the existing data structure
  const gridDataToUse = data || { data: [], total: 0 };

  // Use dataState if provided, otherwise use defaults
  const currentSkip = dataState?.skip ?? 0;
  const currentTake = dataState?.take ?? defaultTake;

  // Debug logging for loading state
  if (loading) {
    console.log('🟢 GridTable: Loading prop is TRUE', { loading, name });
  }

  return (
    <div className="grid-table-wrapper" style={{ position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <Loader size="medium" type="converging-spinner" />
        </div>
      )}
      <Grid
        style={{ 
          height: gridHeight,
        }}
        name={'name'}
        data={gridDataToUse}
        sortable={sortable}
        filterable={filterable}
        skip={currentSkip}
        take={currentTake}
        total={gridDataToUse.total || (Array.isArray(gridDataToUse) ? gridDataToUse.length : gridDataToUse.data?.length || 0)}
        page={page}
        onDataStateChange={dataStateChange}
        pageable={{
            buttonCount: buttonCount,
            pageSizes: pageSizes,
            pageSize: currentTake
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
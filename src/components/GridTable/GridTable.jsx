// src/components/GridTable/GridTable.jsx
"use client";

import React from 'react';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Loader } from '@progress/kendo-react-indicators';
import { useTranslation } from 'react-i18next';
import './GridTable.css';

const GridTable = (props) => {
  const { t } = useTranslation();
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

  const isConsumptionPage = name?.includes("Consumption");
  const IsTenantId = !!tenantId;

  // Use the existing data structure
  const gridDataToUse = data || { data: [], total: 0 };

  // Calculate dynamic height based on data length
  const dataLength = Array.isArray(gridDataToUse.data) ? gridDataToUse.data.length : 
                     Array.isArray(gridDataToUse) ? gridDataToUse.length : 0;
  const dynamicHeight = dataLength > 7 ? "450px" : "auto";

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
          height: dynamicHeight,
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
        {/* Conditional tenant columns for consumption pages with tenant filter */}
        {IsTenantId && isConsumptionPage && (
          <GridColumn 
            field="tenantName" 
            title={t("common.customerName")} 
            width={setWidth ? setWidth(200) : 200} 
          />
        )}
        {IsTenantId && isConsumptionPage && (
          <GridColumn 
            field="tenantId" 
            title={t("common.tenantId")} 
            width={setWidth ? setWidth(200) : 200} 
          />
        )}
        {IsTenantId && isConsumptionPage && (
          <GridColumn 
            field="subscriptionDescription" 
            title={t("common.subscriptionName")} 
            width={setWidth ? setWidth(200) : 200} 
          />
        )}
        {IsTenantId && isConsumptionPage && (
          <GridColumn 
            field="subscriptionId" 
            title={t("common.subscriptionId")} 
            width={setWidth ? setWidth(200) : 200} 
          />
        )}
        
        {/* Regular columns */}
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
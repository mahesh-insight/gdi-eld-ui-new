/*
  Use this for simple charts with the following type:
    - bar
    - column
    - area
    - line
  
  Supports both grouped data (multiple series) and single series with individual colors
*/

import React, { useMemo } from 'react';
import { Chart, ChartLegend, ChartTitle, ChartSubtitle, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartTooltip, ChartSeriesItemTooltip, ChartLegendTitle, ChartNoDataOverlay, ChartArea } from '@progress/kendo-react-charts';
import { SvgIcon } from '@progress/kendo-react-common';
import { xCircleIcon } from '@progress/kendo-svg-icons';
import { groupBy } from '@progress/kendo-data-query';
import { useTranslation } from 'react-i18next';
import { getInsightThemeColors } from '@/lib/chartColors';

export const BasicGroupedChart = (props) => {
  const { t } = useTranslation();
  const chartType = props.chartType;
  const title = props.title;
  const subTitle = props.subTitle;
  const data = props.data;
  const groupedByField = props.groupedByField;
  const valueField = props.valueField;
  const categoryField = props.categoryField;
  const valueFormatProp = props.valueFormat;
  const labelFormat = props.labelFormat;
  const showLabels = props.showLabels;
  const categoryTitle = props.categoryTitle;
  const legendPosition = props.legendPosition;
  const legendTitle = props.legendTitle;
  const tooltipFormat = props.tooltipFormat;
  const locale = props.locale;
  const showCategoryLabels = props.showCategoryLabels ?? true;
  const showValueLabels = props.showValueLabels ?? true;
  const legendVisible = props.legendVisible ?? true;
  const stacked = props.stacked ?? false;
  const labelIncludeGroup = props.labelIncludeGroup ?? false;
  const categoryFormat = props.categoryFormat;
  const yAxisLabelStep = props.yAxisLabelStep;
  const useColors = props.useColors ?? false; // New prop to enable individual colors
  const customTooltip = props.customTooltip ?? false; // Enable custom tooltip with label

  let minValue = Infinity;
  let maxValue = -Infinity;
  let hasDecimals = false;

  const hasData = data && data.length > 0;

  if (hasData) {
    for (const item of data) {
      if (item[valueField] !== null && item[valueField] !== undefined) {
         const value = item[valueField];
         if (typeof value === 'number') {
            if (value % 1 !== 0) {
               hasDecimals = true;
            }
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
         }
      }
    }
    if (maxValue === -Infinity) maxValue = 0;
    if (minValue === Infinity) minValue = 0;

  } else {
      maxValue = 0;
      minValue = 0;
  }

  const valueFormatToUse = hasDecimals ? valueFormatProp : (valueFormatProp && valueFormatProp.includes('c') ? 'c0' : 'n0');

  let dynamicMajorUnit = undefined;
  let dynamicMin = undefined;
  let dynamicMax = undefined;

  if (maxValue === 0) {
     dynamicMajorUnit = 1;
     dynamicMin = 0;
     dynamicMax = 1;
  }

  // Check if data needs grouping or individual colors
  const needsGrouping = groupedByField && !useColors;
  
  // Memoize processed data to prevent infinite re-renders
  const processedData = useMemo(() => {
    if (useColors && hasData) {
      const colors = getInsightThemeColors();
      return data.map((item, index) => ({
        ...item,
        color: colors[index]
      }));
    }
    return data;
  }, [data, useColors, hasData]);

  const series = useMemo(() => {
    return needsGrouping ? groupBy(data || [], [
      { field: groupedByField, },
    ]) : null;
  }, [needsGrouping, data, groupedByField]);

  const mapSeries = (item, idx) => (
    <ChartSeriesItem
      key={idx}
      data={item.items}
      name={item.value}
      field={valueField}
      categoryField={categoryField}
      type={chartType}
      labels={{
        visible: showLabels,
        format: labelIncludeGroup ? item.value + " \n {0:" + labelFormat + "}" : labelFormat,
      }}
      stack={stacked}
    >
      <ChartSeriesItemTooltip format={item.value + " - " + "{0:" + tooltipFormat + "}"} />
    </ChartSeriesItem>
  );

  return (
    <>
      <ChartArea margin={{ top: 15 }} /> 
      <ChartLegend visible={legendVisible} position={legendPosition}>
        <ChartLegendTitle text={legendTitle}></ChartLegendTitle>
      </ChartLegend>
      <ChartTitle text={title} />
      <ChartSubtitle text={subTitle} />
      
      {/* Custom tooltip for single series with label names */}
      {customTooltip && !needsGrouping && (
        <ChartTooltip 
          render={(context) => {
            const { point } = context;
            const label = point.dataItem.label || point.category;
            const formattedValue = point.value.toLocaleString('en-US', { 
              style: tooltipFormat?.includes('c') ? 'currency' : 'decimal', 
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            return `${label} - ${formattedValue}`;
          }}
        />
      )}
      
      {/* Default tooltip for grouped series */}
      {!customTooltip && needsGrouping && <ChartTooltip format={tooltipFormat} />}
      
      <ChartCategoryAxis>
        <ChartCategoryAxisItem
          title={{ text: categoryTitle }}
          labels={{
            visible: showCategoryLabels,
            format: categoryFormat,
            step: 1,
          }}
        />
      </ChartCategoryAxis>
      
      {/* Use ChartValueAxis for better control */}
      <ChartValueAxis>
        <ChartValueAxisItem
          labels={{
            format: valueFormatToUse,
            visible: showValueLabels,
            step: yAxisLabelStep,
          }}
          min={dynamicMin}
          max={dynamicMax}
          majorUnit={dynamicMajorUnit}
        />
      </ChartValueAxis>
      
      <ChartSeries>
        {needsGrouping ? (
          // Grouped series (existing behavior)
          series.map(mapSeries)
        ) : (
          // Single series with optional individual colors
          <ChartSeriesItem
            type={chartType}
            data={processedData}
            categoryField={categoryField}
            field={valueField}
            colorField={useColors ? "color" : undefined}
            labels={{
              visible: showLabels,
              content: labelIncludeGroup 
                ? (e) => `${e.dataItem.label || e.category}\n${e.value.toLocaleString('en-US', { 
                    style: labelFormat?.includes('c') ? 'currency' : 'decimal',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`
                : labelFormat,
            }}
            stack={stacked}
          />
        )}
      </ChartSeries>
      
      <ChartNoDataOverlay>
        <div>
          <SvgIcon icon={xCircleIcon} themeColor="error" size="xxlarge"></SvgIcon>
          <p style={{ paddingTop: '8px' }}>{t("common.noData")}</p>
        </div>
      </ChartNoDataOverlay>
    </>
  );
};
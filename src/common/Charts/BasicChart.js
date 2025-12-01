import * as React from "react";
import {
  Chart,
  ChartTitle,
  ChartSubtitle,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartLegend,
  ChartLegendTitle,
  ChartTooltip,
  ChartAxisDefaults,
  ChartArea,
} from "@progress/kendo-react-charts";
import { IntlProvider } from "@progress/kendo-react-intl";
import "hammerjs";

export const BasicChart = (props) => {
  //set variables from properties passed
  const chartType = props.chartType; // area, line, bar, column, etc
  const title = props.title; // chart title
  const subTitle = props.subTitle; //chart subtitle
  const data = props.data; //chart data
  const valueField = props.valueField; // field for values (y axis)
  const categoryField = props.categoryField; // field for categories (x axis)
  const labelFormat = props.labelFormat; // format for labels (ex c2 for currency with decimals, n0 for number, no decimals)
  const showLabels = props.showLabels ?? false; //shows or hides value labels
  const legendPosition = props.legendPosition; //position of the legend, top, right, bottom, etc
  const legendTitle = props.legendTitle; //title of the legend
  const tooltipFormat = props.tooltipFormat; // format for tooltip (ex "My tooltip {0:c}")
  const locale = props.locale; // culture local (ex. "en-GB")
  const showValueLabels = props.showValueLabels ?? true;
  const valueFormat = props.valueFormat;
  const labelIncludeGroup = props.labelIncludeGroup ?? false;

  return (
    <>
      <ChartArea margin={{ top: 15 }} /> 
      <ChartLegend visible={true} position={legendPosition}>
        <ChartLegendTitle text={legendTitle}></ChartLegendTitle>
      </ChartLegend>
      <ChartTitle text={title} />
      <ChartSubtitle text={subTitle} />
      <ChartAxisDefaults
        labels={{
          format: valueFormat,
          visible: showValueLabels
        }}
      />
      <ChartSeries>
        <ChartSeriesItem
          type={chartType}
          data={data}
          field={valueField}
          categoryField={categoryField}
          colorField="color"
          labels={{
            visible: showLabels,
            format: labelFormat,
            //content: labelContent
          }}
        />
      </ChartSeries>
      <ChartTooltip format={tooltipFormat} />
    </>
  );
};

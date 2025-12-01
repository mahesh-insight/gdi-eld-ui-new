import React from "react";
import {
  ChartLegend,
  ChartTitle,
  ChartSubtitle,
  ChartSeries,
  ChartSeriesItem,
  ChartTooltip,
  ChartNoDataOverlay,
  ChartArea,
} from "@progress/kendo-react-charts";
import { SvgIcon } from "@progress/kendo-react-common";
import { xCircleIcon } from "@progress/kendo-svg-icons";
import { useTranslation } from "react-i18next";

export const BasicPieDoughnutChart = (props) => {
  const { t } = useTranslation();
  const {
    chartType,
    title,
    subTitle,
    data,
    categoryField,
    valueField,
    tooltipFormat,
    legendPosition = "bottom",
    legendVisible = true,
    showLabels = true,
    labelIncludeGroup,
    labelFormat,
  } = props;

  const cleanData = data?.map((item) => ({
      ...item,
      [valueField]:
        typeof item[valueField] === "string"
          ? parseFloat(item[valueField])
          : item[valueField],
    }))
    .filter(
      (item) => item[valueField] !== null && item[valueField] !== undefined
    );

  return (
    <>
      <ChartArea margin={{ top: 15 }} /> 
      <ChartTitle text={title} />
      <ChartSubtitle text={subTitle} />
      {legendVisible && <ChartLegend position={legendPosition} />}
      <ChartTooltip format={(e) => `${e.category} - ` + "{0:" + tooltipFormat + "}"} />
      <ChartSeries>
        <ChartSeriesItem
          type={chartType}
          data={cleanData}
          categoryField={categoryField}
          startAngle={50}
          field={valueField}
          labels={{
            visible: showLabels,
            format: labelIncludeGroup
              ? (e) => `${e.category} \n {0:${labelFormat}}`
              : `{0:${labelFormat}}`,
          }}
        ></ChartSeriesItem>
      </ChartSeries>
      <ChartNoDataOverlay>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <SvgIcon
            icon={xCircleIcon}
            themeColor="error"
            size="xxlarge"
          ></SvgIcon>
          <p style={{ paddingTop: "8px", color: "#666" }}>
            {t("common.noData")}
          </p>
        </div>
      </ChartNoDataOverlay>
    </>
  );
};

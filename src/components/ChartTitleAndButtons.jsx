import React, { useEffect, useState } from "react";
import { ButtonGroup, Button } from "@progress/kendo-react-buttons";
import { SvgIcon } from "@progress/kendo-react-common";
import * as svgIcons from "@progress/kendo-svg-icons";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import "./ChartTitleAndButtons.css";

const ChartTitleAndButtons = ({ 
  title, 
  trendingChartType, 
  handleChartTypeChange, 
  chartOptions, 
  dropDownList, 
  apiEndPoint, 
  pageType,
  onPeriodChange, // Callback for period changes
  selectedPeriod: selectedPeriodProp // Controlled period value from parent
}) => {
  const timePeriodsInvoiceHistory = ["Last 12 Months", "Yearly"];
  const timePeriodsInvoice = ["Last 6 Months", "Last 12 Months"];
  const timePeriodsToUse = pageType === "invoiceHistory" ? timePeriodsInvoiceHistory : timePeriodsInvoice;
  const desiredInitialPeriod = pageType === "invoiceHistory" ? "Last 12 Months" : "Last 6 Months";

  // Use controlled prop if provided, otherwise use local state
  const selectedPeriod = selectedPeriodProp || desiredInitialPeriod;

  const handlePeriodChange = (e) => {
    // Call parent's handler if provided
    if (onPeriodChange) {
      onPeriodChange(e.value);
    }
  };

  const isDashboard = pageType === 'dashboard';
  const containerClass = `chart-title-container ${isDashboard ? 'dashboard' : 'default'}`;
  const titleWrapperClass = `chart-title-wrapper ${isDashboard ? 'dashboard' : ''}`;
  const controlsClass = `chart-controls ${isDashboard ? 'dashboard' : ''}`;

  return (
    <div className={containerClass}>
      <div className={titleWrapperClass}>
        <p className="chart-title">
          {title}
        </p>
      </div>
      <div className={controlsClass}>
        {dropDownList && (
          <DropDownList
            data={timePeriodsToUse}
            value={selectedPeriod}
            onChange={handlePeriodChange}
          />
        )}
        <ButtonGroup>
          {chartOptions?.map(({ type, icon, title: buttonTitle }) => (
            <Button
              key={type}
              togglable={true}
              className="k-grid-download"
              selected={trendingChartType === type}
              onClick={() => handleChartTypeChange(type)}
              title={buttonTitle}
            >
              <SvgIcon icon={svgIcons[icon]} size="medium" />
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  );
};

export default ChartTitleAndButtons;
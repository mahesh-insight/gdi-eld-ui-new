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
  pageType 
}) => {
  const timePeriodsInvoiceHistory = ["Last 12 Months", "Yearly"];
  const timePeriodsInvoice = ["Last 6 Months", "Last 12 Months"];
  const timePeriodsToUse = pageType === "invoiceHistory" ? timePeriodsInvoiceHistory : timePeriodsInvoice;
  const desiredInitialPeriod = pageType === "invoiceHistory" ? "Last 12 Months" : "Last 6 Months";

  const [selectedPeriod, setSelectedPeriod] = useState(desiredInitialPeriod);

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.value);
    // Add your period change logic here
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
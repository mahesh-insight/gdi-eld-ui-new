import React, { useEffect, useState } from "react";
import { ButtonGroup, Button } from "@progress/kendo-react-buttons";
import { SvgIcon } from "@progress/kendo-react-common";
import * as svgIcons from "@progress/kendo-svg-icons";
import { DropDownList } from "@progress/kendo-react-dropdowns";

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

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '20px' 
    }}>
      <div>
        <p style={{ 
          textAlign: 'center', 
          fontWeight: 'bold',
          margin: 0,
          fontSize: '14px'
        }}>
          {title}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {dropDownList && (
          <DropDownList
            data={timePeriodsToUse}
            value={selectedPeriod}
            onChange={handlePeriodChange}
            style={{ width: '150px' }}
          />
        )}
        <ButtonGroup>
          {chartOptions?.map(({ type, icon, title: buttonTitle }) => (
            <Button
              key={type}
              togglable={true}
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
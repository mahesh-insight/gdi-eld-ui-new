"use client";

import { useSelector } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import './DashboardWidgets.css';
import AzureSpendWidget from './AzureSpendWidget';
import M365Widget from './M365Widget';
import MSCloudWidget from './MSCloudWidget';
import AdobeWidget from './AdobeWidget';
import AWSWidget from './AWSWidget';
import MPSAWidget from './MPSAWidget';

export default function DashboardWidgets({ ssrData, mode }) {
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const widgets = ssrData?.widgets || {};

  // Chart type states for each widget
  const [azureChartType, setAzureChartType] = useState('line');
  const [m365ChartType, setM365ChartType] = useState('column');
  const [msCloudChartType, setMsCloudChartType] = useState('column');
  const [adobeChartType, setAdobeChartType] = useState('column');
  const [awsChartType, setAwsChartType] = useState('column');

  // Chart type change handlers with logging
  const handleAzureChartTypeChange = useCallback((newType) => {
    console.log('🔄 Azure chart type changing to', newType);
    setAzureChartType(newType);
  }, []);

  const handleMsCloudChartTypeChange = useCallback((newType) => {
    console.log('🔄 MS Cloud chart type changing to', newType);
    setMsCloudChartType(newType);
  }, []);

  const handleAdobeChartTypeChange = useCallback((newType) => {
    console.log('🔄 Adobe chart type changing to', newType);
    setAdobeChartType(newType);
  }, []);

  const handleAwsChartTypeChange = useCallback((newType) => {
    console.log('🔄 AWS chart type changing to', newType);
    setAwsChartType(newType);
  }, []);

  const columnLineAreaOptions = [
    { type: 'column', icon: 'chartColumnStackedIcon', title: 'Column chart' },
    { type: 'line', icon: 'chartLineStackedIcon', title: 'Line chart' },
    { type: 'area', icon: 'chartAreaStackedIcon', title: 'Area chart' }
  ];
  
  // Save widget count to localStorage for loading.js to use
  useEffect(() => {
    if (typeof window !== 'undefined' && widgetFlags) {
      const enabledCount = Object.values(widgetFlags).filter(flag => flag === true).length;
      if (enabledCount > 0) {
        localStorage.setItem('dashboard_widget_count', enabledCount.toString());
      }
    }
  }, [widgetFlags]);
  
  const formatCurrency = (value, currencyCode) => {
    if (!value) return `${currencyCode} 0.00`;
    return `${currencyCode} ${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (yyyymm) => {
    if (!yyyymm || yyyymm.length !== 6) return "Invalid Date";
    const year = yyyymm.substring(0, 4);
    const month = yyyymm.substring(4, 6);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month, 10) - 1;
    return monthIndex >= 0 && monthIndex < 12 ? `${monthNames[monthIndex]} ${year}` : "Invalid Month";
  };

  // Render Azure Spend Widget
  const renderAzureSpendWidget = () => {
    if (!widgetFlags.isAzureSpendWidgetDataState) return null;
    const data = widgets.azureSpend?.data || {};
    return (
      <AzureSpendWidget data={data} />
    );
  };

  // Render M365 Widget
  const renderM365Widget = () => {
    if (!widgetFlags.isM365WidgetDataState) return null;
    const data = widgets.m365?.data || {};
    return <M365Widget data={data} />;
  };

  // Render MS Cloud Widget
  const renderMSCloudWidget = () => {
    if (!widgetFlags.isMSSpendWidgetDataState) return null;
    const data = widgets.msCloud?.data || {};
    return <MSCloudWidget data={data} />;
  };

  // Render Adobe Widget
  const renderAdobeWidget = () => {
    if (!widgetFlags.isAdobeWidgetDataState) return null;
    const data = widgets.adobeSpend?.data || {};
    return <AdobeWidget data={data} />;
  };

  // Render AWS Widget
  const renderAWSWidget = () => {
    if (!widgetFlags.isAwsSpendWidgetDataState) return null;
    const data = widgets.awsSpend?.data || {};
    return <AWSWidget data={data} />;
  };

  // Render MPSA Widget
  const renderMPSAWidget = () => {
    if (!widgetFlags.isMPSAWidgetDataState) return null;
    const data = widgets.mpsa?.data || {};
    return <MPSAWidget data={data} />;
  };

  const hasAnyWidgets = Object.values(widgetFlags).some(flag => flag === true);

  if (!hasAnyWidgets) {
    return (
      <div className="no-widgets">
        <h2>📊 No Dashboard Widgets Available</h2>
        <p>No widgets are currently enabled for this account.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-widgets-container">
      <div className="widgets-grid">
        {renderAzureSpendWidget()}
        {renderM365Widget()}
        {renderMSCloudWidget()}
        {renderAWSWidget()}
        {renderAdobeWidget()}
        {renderMPSAWidget()}
      </div>
    </div>
  );
}

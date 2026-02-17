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

export default function DashboardWidgets({ ssrData, mode, useEmbeddedPages = false }) {
  const widgetFlags = useSelector(state => state.dashboard.widgetFlags);
  const widgets = ssrData?.widgets || {};
  const [soldToId, setSoldToId] = useState(null);

  // Get soldToId from localStorage for embedded pages
  useEffect(() => {
    if (useEmbeddedPages && typeof window !== 'undefined') {
      try {
        const storedSoldToId = localStorage.getItem('soldToId');
        if (storedSoldToId) {
          const parsed = JSON.parse(storedSoldToId);
          setSoldToId(Array.isArray(parsed) ? parsed[0] : parsed);
        }
      } catch (e) {
        console.warn('Failed to parse soldToId from localStorage:', e);
      }
    }
  }, [useEmbeddedPages]);

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

  // Render widget as embedded page (iframe) or component
  const renderWidget = (flag, widgetPath, WidgetComponent, widgetData) => {
    if (!flag) return null;

    if (useEmbeddedPages && soldToId) {
      return (
        <div className="widget-iframe-container">
          <iframe
            src={`/widgets/${widgetPath}?soldToId=${soldToId}`}
            title={`${widgetPath} widget`}
            className="widget-iframe"
            loading="lazy"
          />
        </div>
      );
    }

    const data = widgetData?.data || {};
    return <WidgetComponent data={data} />;
  };

  // Render Azure Spend Widget
  const renderAzureSpendWidget = () => {
    return renderWidget(
      widgetFlags.isAzureSpendWidgetDataState,
      'azure-spend',
      AzureSpendWidget,
      widgets.azureSpend
    );
  };

  // Render M365 Widget
  const renderM365Widget = () => {
    return renderWidget(
      widgetFlags.isM365WidgetDataState,
      'm365',
      M365Widget,
      widgets.m365
    );
  };

  // Render MS Cloud Widget
  const renderMSCloudWidget = () => {
    return renderWidget(
      widgetFlags.isMSSpendWidgetDataState,
      'mscloud',
      MSCloudWidget,
      widgets.msCloud
    );
  };

  // Render Adobe Widget
  const renderAdobeWidget = () => {
    return renderWidget(
      widgetFlags.isAdobeWidgetDataState,
      'adobe',
      AdobeWidget,
      widgets.adobeSpend
    );
  };

  // Render AWS Widget
  const renderAWSWidget = () => {
    return renderWidget(
      widgetFlags.isAwsSpendWidgetDataState,
      'aws',
      AWSWidget,
      widgets.awsSpend
    );
  };

  // Render MPSA Widget
  const renderMPSAWidget = () => {
    return renderWidget(
      widgetFlags.isMPSAWidgetDataState,
      'mpsa',
      MPSAWidget,
      widgets.mpsa
    );
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

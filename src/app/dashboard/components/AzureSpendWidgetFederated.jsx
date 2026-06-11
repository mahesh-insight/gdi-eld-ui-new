"use client";
import { useState, useEffect } from 'react';
import AzureSpendWidget from './AzureSpendWidget';

/**
 * Self-contained federated version of AzureSpendWidget.
 * Fetches its own data — safe to load in consumer apps via Module Federation.
 *
 * @param {string}  soldTo       - The account's sold-to ID (MPSA account).
 * @param {string}  accessToken  - Bearer JWT for the API call.
 * @param {string}  apiBaseUrl   - Base URL of the backing API, e.g. 'https://api-ccrdev.insight.com'
 * @param {string}  [chartType]  - Initial chart type: 'line' | 'column' | 'area'. Defaults to 'line'.
 * @param {Function} [onChartTypeChange] - Callback when the chart type changes.
 * @param {Array}   [chartOptions] - Array of chart type option descriptors.
 * @param {boolean} [dropDownList]  - Whether to use a dropdown list for chart type selection.
 * @param {string}  [pageType]      - Context hint passed to the inner widget ('dashboard' | other).
 */
export default function AzureSpendWidgetFederated({
  soldTo,
  accessToken,
  apiBaseUrl = '',
  chartType,
  onChartTypeChange,
  chartOptions,
  dropDownList,
  pageType = 'dashboard',
}) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!soldTo || !accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${apiBaseUrl}/ccr-dashboard-service/microsoft/azurespend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify([soldTo]),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [soldTo, accessToken, apiBaseUrl]);

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading Azure Spend...</div>;
  }

  if (error) {
    return <div style={{ padding: '1rem', color: 'red' }}>Failed to load Azure Spend: {error}</div>;
  }

  return (
    <AzureSpendWidget
      data={data}
      chartType={chartType}
      onChartTypeChange={onChartTypeChange}
      chartOptions={chartOptions}
      dropDownList={dropDownList}
      pageType={pageType}
    />
  );
}

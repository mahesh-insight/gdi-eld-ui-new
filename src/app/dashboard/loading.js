// src/app/dashboard/loading.js
"use client";
import { Skeleton } from '@progress/kendo-react-indicators';
import { useEffect, useState } from 'react';
import './loading.css';

export default function Loading() {
  const [widgetCount, setWidgetCount] = useState(3); // Default to 3 widgets

  useEffect(() => {
    // Try to get the widget count from localStorage (saved from previous session)
    if (typeof window !== 'undefined') {
      const savedCount = localStorage.getItem('dashboard_widget_count');
      if (savedCount) {
        setWidgetCount(parseInt(savedCount, 10));
      }
    }
  }, []);

  return (
    <div className="dashboard-loading-page">
      <div className="dashboard-loading-container">
        {/* Widget Grid - Dynamic based on saved count */}
        <div className="dashboard-loading-widgets">
          {Array.from({ length: widgetCount }).map((_, index) => (
            <div key={index} className="dashboard-loading-skeleton-widget"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

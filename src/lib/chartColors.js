// Chart color utilities for insight theme
export const getInsightThemeColors = () => {
  // Use CSS custom properties from insight-theme.css
  const getComputedCSSVar = (property) => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue(property).trim();
    }
    return '';
  };

  // Chart series colors based on insight theme
  // Order matches data series: Azure Usage (teal), Cloud License (magenta), Perpetual License (gray), Telco Charge (light blue)
  return [
    '#007996',    // Teal for Azure Usage
    '#ae0a46',    // Magenta for Cloud License (direct color, bypassing CSS var)
    '#CBC4C3',    // Gray for Perpetual License
    '#95CFEE',    // Blue for Telco Charge
    '#A80B6E',    // Orange for additional series
    '#5F5753',    // Green for additional series
    '#85BCCB',    // Error red for additional series
    '#BD4673',    // Brown fallback
    '#E6E6E5',    // Sea green fallback
    '#DCF0FA'     // Royal blue fallback
  ];
};

// Static colors that match insight theme (fallback when CSS vars not available)
export const INSIGHT_THEME_CHART_COLORS = [
  '#007996', // tertiary - teal (Azure Usage)
  '#ae0a46', // primary - magenta (Cloud License)
  '#CBC4C3', // secondary - gray (Perpetual License)
  '#95CFEE', // info - blue (Telco Charge)
  '#A80B6E', // warning - orange
  '#5F5753', // success - green
  '#85BCCB', // error - red
  '#BD4673', // brown
  '#E6E6E5', // sea green
  '#DCF0FA'  // royal blue
];
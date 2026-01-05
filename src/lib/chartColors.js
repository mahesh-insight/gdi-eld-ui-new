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
    '#666666',    // Gray for Perpetual License
    '#0058e9',    // Blue for Telco Charge
    '#ffc000',    // Orange for additional series
    '#37b400',    // Green for additional series
    '#f31700',    // Error red for additional series
    '#8B5A2B',    // Brown fallback
    '#2E8B57',    // Sea green fallback
    '#4169E1'     // Royal blue fallback
  ];
};

// Static colors that match insight theme (fallback when CSS vars not available)
export const INSIGHT_THEME_CHART_COLORS = [
  '#007996', // tertiary - teal (Azure Usage)
  '#ae0a46', // primary - magenta (Cloud License)
  '#666666', // secondary - gray (Perpetual License)
  '#0058e9', // info - blue (Telco Charge)
  '#ffc000', // warning - orange
  '#37b400', // success - green
  '#f31700', // error - red
  '#8B5A2B', // brown
  '#2E8B57', // sea green
  '#4169E1'  // royal blue
];
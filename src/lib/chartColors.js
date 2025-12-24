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
  // These correspond to: Azure Savings Plan (tertiary), Azure Usage (primary), Cloud License (secondary), 
  // Marketplace (info), Reserved Instance (warning)
  return [
    getComputedCSSVar('--kendo-color-tertiary') || '#007996',    // Teal for Azure Savings Plan
    getComputedCSSVar('--kendo-color-primary') || '#ff6358',     // Red for Azure Usage 
    getComputedCSSVar('--kendo-color-secondary') || '#666666',   // Gray for Cloud License
    getComputedCSSVar('--kendo-color-info') || '#0058e9',        // Blue for Marketplace
    getComputedCSSVar('--kendo-color-warning') || '#ffc000',     // Orange for Reserved Instance
    getComputedCSSVar('--kendo-color-success') || '#37b400',     // Green for additional series
    getComputedCSSVar('--kendo-color-error') || '#f31700',       // Error red for additional series
    '#8B5A2B',  // Brown fallback
    '#2E8B57',  // Sea green fallback
    '#4169E1'   // Royal blue fallback
  ];
};

// Static colors that match insight theme (fallback when CSS vars not available)
export const INSIGHT_THEME_CHART_COLORS = [
  '#007996', // tertiary - teal
  '#ff6358', // primary - red  
  '#666666', // secondary - gray
  '#0058e9', // info - blue
  '#ffc000', // warning - orange
  '#37b400', // success - green
  '#f31700', // error - red
  '#8B5A2B', // brown
  '#2E8B57', // sea green
  '#4169E1'  // royal blue
];
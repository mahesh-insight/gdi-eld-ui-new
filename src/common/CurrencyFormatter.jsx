import * as React from 'react';
import { useInternationalization } from '@progress/kendo-react-intl';
import { Tooltip } from '@progress/kendo-react-tooltip';

/**
 * CurrencyFormatter Component
 * Formats currency values with proper internationalization
 * Includes Kendo Tooltip on hover
 * 
 * @param {Object} props
 * @param {number} props.value - The numeric value to format
 * @param {string} props.title - Optional tooltip text
 * @param {boolean} props.alignRight - Whether to right-align the text
 * @param {boolean} props.showCurrencyCode - Whether to show currency code (e.g., "USD")
 * @param {string} props.currency - Currency code (default: 'USD')
 * 
 * @example
 * <CurrencyFormatter
 *   title="Current estimated usage"
 *   value={1234.56}
 *   alignRight={true}
 *   showCurrencyCode={true}
 * />
 * // Output: USD $1,234.56
 */
export const CurrencyFormatter = (props) => {
  const {
    value = 0,
    title,
    alignRight = false,
    showCurrencyCode = true,
    currency = 'USD'
  } = props;

  const intl = useInternationalization();

  // Format the currency value using Kendo's intl formatter
  const formattedValue = intl?.formatNumber(value, 'c') || `$${value.toFixed(2)}`;

  // Get currency symbol from the formatted value
  // The 'c' format already includes the currency symbol
  const displayValue = showCurrencyCode 
    ? `${currency} ${formattedValue}`
    : formattedValue;

  return (
    <Tooltip anchorElement="target" position="auto">
      <span 
        className="metric-value"
        title={title || displayValue}
        style={{ 
          textAlign: alignRight ? 'right' : 'left',
          display: 'inline-block'
        }}
      >
        {displayValue}
      </span>
    </Tooltip>
  );
};

export default CurrencyFormatter;

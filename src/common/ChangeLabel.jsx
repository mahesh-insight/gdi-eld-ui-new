"use client";

import { Tooltip } from '@progress/kendo-react-tooltip';
import { useInternationalization } from '@progress/kendo-react-intl';

export const ChangeLabel = ({ 
  title, 
  value, 
  currency = 'USD', 
  percentage, 
  showPercentage = false,
  className = 'change-info'
}) => {
  const intl = useInternationalization();

  // Format the currency value using Kendo's intl formatter
  const formattedValue = intl?.formatNumber(value, 'c') || `$${value.toFixed(2)}`;
  const percentageText = showPercentage && percentage ? ` (${percentage}%)` : '';

  return (
    <Tooltip anchorElement="target" position="auto">
      <div className={className} title={title}>
        {currency} <strong>{formattedValue}</strong>{percentageText} from previous month
      </div>
    </Tooltip>
  );
};

import * as React from 'react';
import { Tooltip } from '@progress/kendo-react-tooltip';

/**
 * MetricLabel Component
 * A label component with Kendo Tooltip functionality
 * 
 * @param {Object} props
 * @param {string} props.children - The label text to display
 * @param {string} props.title - Tooltip text (defaults to children if not provided)
 * @param {string} props.className - Additional CSS classes (default: 'metric-label')
 * 
 * @example
 * <MetricLabel title="Full description of current estimated usage">
 *   Current Estimated Usage
 * </MetricLabel>
 */
export const MetricLabel = ({ children, title, className = 'metric-label' }) => {
  return (
    <Tooltip anchorElement="target" position="auto">
      <span 
        className={className}
        title={title || children}
      >
        {children}
      </span>
    </Tooltip>
  );
};

export default MetricLabel;

// Simple currency formatter component
export const CurrencyFormatter = ({ value, alignRight, title, ...props }) => {
  if (value === undefined || value === null || isNaN(value)) {
    return <span title={title}>-</span>;
  }

  // Format as currency - simple implementation
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));

  return (
    <span 
      style={{ 
        textAlign: alignRight ? 'right' : 'left',
        display: alignRight ? 'block' : 'inline'
      }}
      title={title}
      {...props}
    >
      {formatted}
    </span>
  );
};
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Converts date format from YYYYMM to "Mon YYYY" format
 * @param {string} yyyymm - Date in YYYYMM format (e.g., "202512")
 * @returns {string} Formatted date (e.g., "Dec 2025") or "Invalid Date" if invalid
 * 
 * @example
 * formatMonthYear("202512") // Returns "Dec 2025"
 * formatMonthYear("202401") // Returns "Jan 2024"
 */
export function formatMonthYear(yyyymm) {
  if (!yyyymm || yyyymm.length !== 6) return "Invalid Date";
  
  const year = yyyymm.substring(0, 4);
  const month = yyyymm.substring(4, 6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(month, 10) - 1;
  
  return monthIndex >= 0 && monthIndex < 12 ? `${monthNames[monthIndex]} ${year}` : "Invalid Month";
}

export function exceptionHandler(error) {
  console.error('Exception:', error);
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Chart data utility functions

/**
 * Get formatted month details from a date string
 * @param {string} dateString - Date string in YYYYMM format
 * @returns {Object} Formatted date details
 */
export const getFormattedMonthDetails = (dateString) => {
  if (!dateString || dateString.length !== 6) {
    return {
      date: new Date().toISOString(),
      text: 'Invalid Date',
      value: dateString
    };
  }

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed in Date

  const date = new Date(year, month, 1);
  const isoDate = date.toISOString();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const text = `${monthNames[month]} ${year}`;

  return {
    date: isoDate,
    text: text,
    value: dateString
  };
};
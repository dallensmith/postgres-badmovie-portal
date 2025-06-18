/**
 * Utility function to safely format dates without timezone offset issues
 * Handles both string dates (YYYY-MM-DD) and Date objects
 */
export function formatDateSafely(date: string | Date | null | undefined): string {
  if (!date) return 'Unknown Date';
  
  try {
    // If it's a string date, try parsing it safely
    if (typeof date === 'string') {
      // Handle ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
      if (date.includes('T')) {
        return new Date(date).toLocaleDateString();
      }
      // Handle simple date format (YYYY-MM-DD)
      else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(date + 'T12:00:00').toLocaleDateString();
      }
      // Try parsing as-is for other formats
      else {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? 'Invalid Date' : parsed.toLocaleDateString();
      }
    }
    
    // If it's already a Date object, use it as-is
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString();
  } catch (error) {
    console.warn('Date parsing error:', error, 'for date:', date);
    return 'Invalid Date';
  }
}

/**
 * Utility function to safely format dates with custom options
 */
export function formatDateSafelyWithOptions(
  date: string | Date | null | undefined, 
  options: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'Unknown Date';
  
  try {
    let dateObj: Date;
    
    // If it's a string date, try parsing it safely
    if (typeof date === 'string') {
      // Handle ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
      if (date.includes('T')) {
        dateObj = new Date(date);
      }
      // Handle simple date format (YYYY-MM-DD)
      else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateObj = new Date(date + 'T12:00:00');
      }
      // Try parsing as-is for other formats
      else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }
    
    return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn('Date parsing error:', error, 'for date:', date);
    return 'Invalid Date';
  }
}

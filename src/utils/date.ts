/**
 * Get business date from timestamp.
 * Business day starts at 4:00 AM - if hour < 4, returns previous day's date.
 * Used for all date-based queries and streak calculation.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date string in YYYY-MM-DD format
 */
export function getBusinessDate(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();

  // If before 4 AM, use previous day
  if (hours < 4) {
    date.setDate(date.getDate() - 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

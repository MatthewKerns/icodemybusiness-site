/**
 * Filters an array of records by a date range using a timestamp field.
 *
 * @param records - Array of records to filter
 * @param timestampField - The key of the timestamp field on each record
 * @param startDate - Optional start date (inclusive, epoch ms)
 * @param endDate - Optional end date (inclusive, epoch ms)
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  records: T[],
  timestampField: keyof T & string,
  startDate?: number,
  endDate?: number,
): T[] {
  let filtered = records;
  if (startDate !== undefined) {
    filtered = filtered.filter((r) => (r[timestampField] as number) >= startDate);
  }
  if (endDate !== undefined) {
    filtered = filtered.filter((r) => (r[timestampField] as number) <= endDate);
  }
  return filtered;
}

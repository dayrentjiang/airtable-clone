import type { Filter, FilterOperator } from "~/server/lib/types";

/**
 * CELL HIGHLIGHTING UTILITIES
 *
 * Determines which background color to show for a cell:
 * - Search match → yellow (bg-yellow-200)
 * - Filter match → green (bg-green-200)
 * - Both → yellow takes priority (search is more specific)
 * - Neither → no background
 */

/**
 * Check if a cell value matches a filter condition
 */
export function matchesFilter(
  cellValue: string | number | null | undefined,
  filter: Filter,
  columnId: string,
): boolean {
  // Only check filters for this column
  if (filter.columnId !== columnId) return false;

  const value = cellValue ?? "";
  const stringValue = String(value).toLowerCase();
  const filterValue =
    filter.value !== undefined ? String(filter.value).toLowerCase() : "";

  // Convert to numbers for numeric comparisons
  const numValue =
    typeof cellValue === "number" ? cellValue : parseFloat(String(cellValue));
  const numFilter =
    typeof filter.value === "number"
      ? filter.value
      : parseFloat(String(filter.value));

  switch (filter.operator) {
    case "is_empty":
      return value === "" || value === null || value === undefined;

    case "is_not_empty":
      return value !== "" && value !== null && value !== undefined;

    case "contains":
      return filterValue !== "" && stringValue.includes(filterValue);

    case "not_contains":
      return filterValue === "" || !stringValue.includes(filterValue);

    case "equals":
      // Try numeric comparison first if both are valid numbers
      if (!isNaN(numValue) && !isNaN(numFilter)) {
        return numValue === numFilter;
      }
      // Fall back to string comparison
      return stringValue === filterValue;

    case "not_equals":
      // Try numeric comparison first if both are valid numbers
      if (!isNaN(numValue) && !isNaN(numFilter)) {
        return numValue !== numFilter;
      }
      // Fall back to string comparison
      return stringValue !== filterValue;

    case "greater_than":
      return !isNaN(numValue) && !isNaN(numFilter) && numValue > numFilter;

    case "less_than":
      return !isNaN(numValue) && !isNaN(numFilter) && numValue < numFilter;

    case "greater_or_equal":
      return !isNaN(numValue) && !isNaN(numFilter) && numValue >= numFilter;

    case "less_or_equal":
      return !isNaN(numValue) && !isNaN(numFilter) && numValue <= numFilter;

    default:
      return false;
  }
}

/**
 * Check if a cell value matches the search term
 */
export function matchesSearch(
  cellValue: string | number | null | undefined,
  searchTerm: string,
): boolean {
  if (!searchTerm || searchTerm.trim() === "") return false;

  const stringValue = String(cellValue ?? "").toLowerCase();
  return stringValue.includes(searchTerm.toLowerCase());
}

/**
 * Get the highlight class for a cell based on search and filter matches
 *
 * Priority:
 * 1. Search match → yellow
 * 2. Filter match → green (only for complete filters)
 * 3. No match → empty string
 */
export function getCellHighlightClass(
  cellValue: string | number | null | undefined,
  columnId: string,
  searchTerm: string,
  filters: Filter[],
): string {
  // Search takes priority (yellow)
  if (matchesSearch(cellValue, searchTerm)) {
    return "bg-yellow-200";
  }

  // Check if any complete filter matches this cell (green)
  // Only highlight cells that match complete filters (filters with values)
  const NO_VALUE_OPERATORS: FilterOperator[] = ["is_empty", "is_not_empty"];

  const hasFilterMatch = filters.some((filter) => {
    // Only consider complete filters (have values or don't need them)
    const isComplete =
      NO_VALUE_OPERATORS.includes(filter.operator) ||
      (filter.value !== undefined &&
        filter.value !== null &&
        filter.value !== "");

    if (!isComplete) return false;

    // Check if this filter matches the cell
    // Highlight for all operators that match (text and number)
    return matchesFilter(cellValue, filter, columnId);
  });

  if (hasFilterMatch) {
    return "bg-green-200";
  }

  return "";
}

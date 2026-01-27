/**
 * DataGrid Constants
 * Single source of truth for grid configuration
 */

/**
 * Height of each row in pixels
 * This value is used for:
 * - Virtual scrolling calculations (TanStack Virtual)
 * - Scroll position calculations (useWindowedRows)
 * - Actual row rendering height
 *
 * Change this value to adjust row height throughout the entire grid.
 * Recommended range: 30-60px
 */
export const ROW_HEIGHT = 35;

/**
 * Number of rows to fetch per window
 * Larger = fewer requests but more data per request
 * Smaller = more requests but faster initial load
 */
export const WINDOW_SIZE = 300;

/**
 * Number of extra rows to render above/below viewport
 * Higher = smoother fast scrolling but more DOM elements
 * Lower = better performance but potential blank areas during fast scroll
 */
export const OVERSCAN_COUNT = 50;

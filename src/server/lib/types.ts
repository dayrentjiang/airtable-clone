import { z } from "zod";

/**
 * SHARED TYPES FOR VIEWS AND ROWS
 * Central location for all view configuration types
 */

// Filter operators
export const filterOperatorSchema = z.enum([
  // Text operators
  "is_empty",
  "is_not_empty",
  "contains",
  "not_contains",
  "equals",
  "not_equals",
  // Number operators
  "greater_than",
  "less_than",
  "greater_or_equal",
  "less_or_equal",
]);

// Single filter
export const filterSchema = z.object({
  columnId: z.string(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number()]).optional(),
});

// Sort
export const sortSchema = z.object({
  columnId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

// Full view config
export const viewConfigSchema = z.object({
  filters: z.array(filterSchema).default([]),
  sorts: z.array(sortSchema).default([]),
  hiddenFields: z.array(z.string()).default([]),
  fieldOrder: z.array(z.string()).default([]),
});

// Export types
export type FilterOperator = z.infer<typeof filterOperatorSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type ViewConfig = z.infer<typeof viewConfigSchema>;

// Cell data type for rows
export type CellData = Record<string, string | number | null>;

// Reusable schema for cell data (columnId -> value)
export const cellDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()]),
);

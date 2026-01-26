import { Prisma } from "../../../generated/prisma";
import type { Filter, Sort } from "./types";

/**
 * QUERY BUILDER UTILITIES
 * SQL builders for JSONB filters and sorts
 * Extracted from router files for testability and reusability
 */

/**
 * Build WHERE clause for a single filter (JSONB)
 * @param filter - The filter configuration
 * @param columnType - The type of column being filtered (TEXT or NUMBER)
 * @returns Prisma.Sql fragment or null if invalid
 */
export function buildFilterCondition(
  filter: Filter,
  columnType: "TEXT" | "NUMBER",
): Prisma.Sql | null {
  const { columnId, operator, value } = filter;

  // Escape columnId to prevent SQL injection
  const jsonPath = Prisma.sql`data->>${Prisma.raw(`'${columnId.replace(/'/g, "''")}'`)}`;

  switch (operator) {
    case "is_empty":
      return Prisma.sql`(${jsonPath} IS NULL OR ${jsonPath} = '')`;

    case "is_not_empty":
      return Prisma.sql`(${jsonPath} IS NOT NULL AND ${jsonPath} != '')`;

    case "contains":
      if (typeof value !== "string") return null;
      return Prisma.sql`${jsonPath} ILIKE ${`%${value}%`}`;

    case "not_contains":
      if (typeof value !== "string") return null;
      return Prisma.sql`(${jsonPath} IS NULL OR ${jsonPath} NOT ILIKE ${`%${value}%`})`;

    case "equals":
      if (columnType === "NUMBER" && typeof value === "number") {
        return Prisma.sql`(${jsonPath})::numeric = ${value}`;
      }
      return Prisma.sql`${jsonPath} = ${String(value)}`;

    case "not_equals":
      if (columnType === "NUMBER" && typeof value === "number") {
        return Prisma.sql`(${jsonPath} IS NULL OR (${jsonPath})::numeric != ${value})`;
      }
      return Prisma.sql`(${jsonPath} IS NULL OR ${jsonPath} != ${String(value)})`;

    case "greater_than":
      if (typeof value !== "number") return null;
      return Prisma.sql`(${jsonPath})::numeric > ${value}`;

    case "less_than":
      if (typeof value !== "number") return null;
      return Prisma.sql`(${jsonPath})::numeric < ${value}`;

    case "greater_or_equal":
      if (typeof value !== "number") return null;
      return Prisma.sql`(${jsonPath})::numeric >= ${value}`;

    case "less_or_equal":
      if (typeof value !== "number") return null;
      return Prisma.sql`(${jsonPath})::numeric <= ${value}`;

    default:
      return null;
  }
}

/**
 * Build ORDER BY clause for sorts (JSONB)
 * @param sorts - Array of sort configurations
 * @param columnTypes - Map of columnId to column type
 * @returns Prisma.Sql fragment for ORDER BY clause
 */
export function buildSortClause(
  sorts: Sort[],
  columnTypes: Map<string, "TEXT" | "NUMBER">,
): Prisma.Sql {
  if (sorts.length === 0) {
    return Prisma.sql`"order" ASC`;
  }

  const sortClauses = sorts.map((sort) => {
    const columnType = columnTypes.get(sort.columnId) ?? "TEXT";
    const jsonPath = Prisma.raw(
      `data->>'${sort.columnId.replace(/'/g, "''")}'`,
    );

    // ASC (A-Z, 1-9): NULLs first, then values ascending
    // DESC (Z-A, 9-1): values descending, then NULLs last
    if (columnType === "NUMBER") {
      return sort.direction === "asc"
        ? Prisma.sql`(${jsonPath})::numeric ASC NULLS FIRST`
        : Prisma.sql`(${jsonPath})::numeric DESC NULLS LAST`;
    } else {
      // Use LOWER() for case-insensitive text sorting
      return sort.direction === "asc"
        ? Prisma.sql`LOWER(${jsonPath}) ASC NULLS FIRST`
        : Prisma.sql`LOWER(${jsonPath}) DESC NULLS LAST`;
    }
  });

  // Join with commas and add default order as tiebreaker
  return Prisma.sql`${Prisma.join(sortClauses, ", ")}, "order" ASC`;
}

/**
 * Build global search condition across multiple text columns
 * @param searchTerm - The search string
 * @param textColumnIds - Array of text column IDs to search
 * @returns Prisma.Sql fragment for search condition or null if no columns
 */
export function buildSearchCondition(
  searchTerm: string,
  textColumnIds: string[],
): Prisma.Sql | null {
  if (!searchTerm.trim() || textColumnIds.length === 0) {
    return null;
  }

  const searchConditions = textColumnIds.map((columnId) => {
    const jsonPath = Prisma.raw(`data->>'${columnId.replace(/'/g, "''")}'`);
    return Prisma.sql`${jsonPath} ILIKE ${`%${searchTerm}%`}`;
  });

  return Prisma.sql`(${Prisma.join(searchConditions, " OR ")})`;
}

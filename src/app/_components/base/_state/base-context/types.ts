import type { ReactNode } from "react";

/**
 * BASE CONTEXT TYPES
 *
 * Type definitions for the base-level context that manages:
 * - Table/view selection state
 * - Base, tables, and views data
 * - CRUD operations for tables and views
 */

// ============================================================================
// CONTEXT VALUE
// ============================================================================

export interface BaseContextValue {
  // Current selections
  baseId: string;
  activeTableId: string | null;
  activeViewId: string | null;

  // Data (cached, fetched once)
  base: { id: string; name: string } | null;
  tables: Array<{
    id: string;
    name: string;
    baseId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  views: Array<{
    id: string;
    name: string;
    type: string;
    tableId: string;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // Computed/derived data
  activeTable: {
    id: string;
    name: string;
    baseId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  activeView: {
    id: string;
    name: string;
    type: string;
    tableId: string;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null;

  // Loading states
  isLoadingBase: boolean;
  isLoadingTables: boolean;
  isLoadingViews: boolean;

  // Selection actions
  selectTable: (tableId: string) => void;
  selectView: (viewId: string) => void;
  selectTableAndView: (tableId: string, viewId: string) => void;

  // Table operations
  createTable: (
    name: string,
    tempId?: string,
  ) => Promise<{ id: string; name: string }>;
  renameTable: (tableId: string, name: string) => void;
  deleteTable: (tableId: string) => void;

  // View operations
  createView: (
    tableId: string,
    name: string,
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => Promise<{ id: string; name: string }>;
  renameView: (viewId: string, name: string) => void;
  deleteView: (viewId: string) => void;
}

// ============================================================================
// PROVIDER PROPS
// ============================================================================

export interface BaseContextProviderProps {
  children: ReactNode;
  baseId: string;
  initialTableId?: string | null;
  initialViewId?: string | null;
}

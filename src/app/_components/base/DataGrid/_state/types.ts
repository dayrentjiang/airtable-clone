import type { Table } from "@tanstack/react-table";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import type { RowData } from "../hooks/useTableColumns";

/**
 * DATAGRID CONTEXT TYPES
 *
 * Centralized type definitions for DataGrid context.
 * Following the BaseContext pattern for consistency.
 */

export interface DataGridContextValue {
  // -------------------------------------------------------------------------
  // IDs
  // -------------------------------------------------------------------------
  tableId: string;
  viewId: string;

  // -------------------------------------------------------------------------
  // DATA (from queries)
  // -------------------------------------------------------------------------
  table: {
    id: string;
    name: string;
    baseId: string;
    columns: Array<{
      id: string;
      name: string;
      type: string;
      tableId: string;
      order: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  } | null;
  rowsByIndex: Map<number, RowData>;
  totalCount: number;
  columns: any[]; // ColumnDef from useTableColumns

  // -------------------------------------------------------------------------
  // LOADING STATES
  // -------------------------------------------------------------------------
  isLoadingTable: boolean;
  isLoadingRows: boolean;

  // -------------------------------------------------------------------------
  // TABLE INSTANCE & VIRTUALIZATION
  // -------------------------------------------------------------------------
  tableInstance: Table<RowData>;
  virtualRows: VirtualItem[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------
  tableWidth: number;
  paddingTop: number;
  paddingBottom: number;
  virtualRowCount: number;

  // -------------------------------------------------------------------------
  // OPERATIONS
  // -------------------------------------------------------------------------
  addOptimisticRow: (row: RowData) => number;
  clearRowValues: (ids: string[]) => Promise<void>;
  invalidateRows: () => void;
}

export interface DataGridContextProviderProps {
  children: React.ReactNode;
  tableId: string;
  viewId: string;
}

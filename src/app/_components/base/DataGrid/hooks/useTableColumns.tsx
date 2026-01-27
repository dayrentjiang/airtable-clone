import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";

export interface RowData {
  id: string;
  order: number;
  data: Record<string, string | number | null>;
  tableId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
  order: number;
}

// Default column width matching Airtable style
const DEFAULT_COLUMN_WIDTH = 180;
const ROW_NUMBER_WIDTH = 66;

/**
 * Creates column definitions for TanStack Table.
 * Note: Cell rendering is handled directly in DataGridTable using DirectEditableCell,
 * not via TanStack Table's cell function. This hook only provides column structure/metadata.
 */
export function useTableColumns(
  columns: Column[] | undefined,
  hiddenFields: string[] = [],
) {
  return useMemo<ColumnDef<RowData>[]>(() => {
    if (!columns) return [];

    // Filter out hidden columns
    const visibleColumns = columns.filter(
      (col) => !hiddenFields.includes(col.id),
    );

    // Row number column (first column)
    const rowNumberColumn: ColumnDef<RowData> = {
      id: "_rowNumber",
      accessorFn: () => "",
      header: "",
      size: ROW_NUMBER_WIDTH,
      enableSorting: false,
      enableResizing: false,
    };

    // Data columns from visible columns
    const dataColumns: ColumnDef<RowData>[] = visibleColumns.map((col) => ({
      id: col.id,
      accessorFn: (row) => row.data[col.id],
      header: col.name,
      meta: {
        type: col.type,
      },
      size: DEFAULT_COLUMN_WIDTH,
    }));

    return [rowNumberColumn, ...dataColumns];
  }, [columns, hiddenFields]);
}

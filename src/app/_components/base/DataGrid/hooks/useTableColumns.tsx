import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { EditableCell } from "../EditableCell";
import { RowNumberCell } from "../RowNumberCell";
import type { Filter, Sort } from "~/server/lib/types";

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

export function useTableColumns(
  columns: Column[] | undefined,
  hiddenFields: string[] = [],
  searchTerm = "",
  filters: Filter[] = [],
  sorts: Sort[] = [],
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
      cell: ({ row }) => (
        <RowNumberCell
          rowIndex={row.index}
          rowNumber={row.index + 1} // Use row index for automatic renumbering
          rowId={row.original.id}
          tableId={row.original.tableId}
        />
      ),
      size: ROW_NUMBER_WIDTH,
      enableSorting: false,
      enableResizing: false,
    };

    // Data columns from visible columns with EditableCell
    const dataColumns: ColumnDef<RowData>[] = visibleColumns.map(
      (col, index) => ({
        id: col.id,
        accessorFn: (row) => {
          const cellData = row.data;
          return cellData[col.id];
        },
        header: col.name,
        cell: (props) => (
          <EditableCell
            {...props}
            columnType={col.type}
            columnId={col.id}
            columnIndex={index + 1} // +1 because row number column is at index 0
            searchTerm={searchTerm} // Pass search term for yellow highlighting
            filters={filters} // Pass filters for green highlighting
            sorts={sorts} // Pass sorts for orange highlighting
          />
        ),
        meta: {
          type: col.type,
        },
        size: DEFAULT_COLUMN_WIDTH,
      }),
    );

    return [rowNumberColumn, ...dataColumns];
  }, [columns, hiddenFields, searchTerm, filters, sorts]);
}

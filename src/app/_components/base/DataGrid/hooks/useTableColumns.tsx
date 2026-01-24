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

export function useTableColumns(columns: Column[] | undefined) {
  return useMemo<ColumnDef<RowData>[]>(() => {
    if (!columns) return [];

    // Row number column (first column)
    const rowNumberColumn: ColumnDef<RowData> = {
      id: "_rowNumber",
      accessorFn: () => "",
      header: "",
      cell: ({ row }) => (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
          {row.original.order + 1}
        </div>
      ),
      size: 50,
      enableSorting: false,
      enableResizing: false,
    };

    // Data columns from table columns
    const dataColumns: ColumnDef<RowData>[] = columns.map((col) => ({
      id: col.id,
      accessorFn: (row) => {
        const cellData = row.data as Record<string, string | number | null>;
        return cellData[col.id];
      },
      header: col.name,
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === null || value === undefined) return "";
        return String(value);
      },
      meta: {
        type: col.type,
      },
      size: 200,
    }));

    return [rowNumberColumn, ...dataColumns];
  }, [columns]);
}

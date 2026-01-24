"use client";

interface DataGridProps {
  tableId: string;
}

export function DataGrid({ tableId }: DataGridProps) {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      DataGrid placeholder for table: {tableId}
    </div>
  );
}

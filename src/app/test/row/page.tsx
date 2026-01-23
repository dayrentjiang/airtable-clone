"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * TEST PAGE FOR ROW ROUTER
 *
 * This page demonstrates all row operations:
 * 1. Get rows with infinite pagination
 * 2. Create a new row
 * 3. Update row data (cell editing)
 * 4. Delete a row
 */

export default function RowTestPage() {
  // State for base and table selection
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // State for row operations
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // ============================================
  // QUERIES: Get bases, tables, and columns
  // ============================================
  const { data: bases, isLoading: basesLoading } = api.base.getAll.useQuery();

  const { data: tables, isLoading: tablesLoading } =
    api.table.getAllByBase.useQuery(
      { baseId: selectedBaseId! },
      { enabled: !!selectedBaseId },
    );

  const { data: columns } = api.column.getAllByTable.useQuery(
    { tableId: selectedTableId! },
    { enabled: !!selectedTableId },
  );

  // ============================================
  // QUERY: Get rows with infinite pagination
  // ============================================
  const {
    data: rowsData,
    isLoading: rowsLoading,
    error: rowsError,
    refetch: refetchRows,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.row.infinite.useInfiniteQuery(
    { tableId: selectedTableId!, limit: 20 },
    {
      enabled: !!selectedTableId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Flatten all pages into a single array
  const rows = rowsData?.pages.flatMap((page) => page.items) ?? [];

  // ============================================
  // MUTATION: Create a new row
  // ============================================
  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      alert("Row created!");
      void refetchRows();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // ============================================
  // MUTATION: Update row data
  // ============================================
  const updateRow = api.row.update.useMutation({
    onSuccess: () => {
      setEditingRowId(null);
      setEditingColumnId(null);
      setEditValue("");
      void refetchRows();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // ============================================
  // MUTATION: Delete a row
  // ============================================
  const deleteRow = api.row.delete.useMutation({
    onSuccess: () => {
      alert("Row deleted!");
      void refetchRows();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Helper to get cell value
  const getCellValue = (
    rowData: Record<string, unknown>,
    columnId: string,
  ): string => {
    const value = rowData[columnId];
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
    return "";
  };

  // Handle cell edit
  const handleCellClick = (
    rowId: string,
    columnId: string,
    currentValue: string,
  ) => {
    setEditingRowId(rowId);
    setEditingColumnId(columnId);
    setEditValue(currentValue);
  };

  // Save cell edit
  const handleSaveCell = () => {
    if (!editingRowId || !editingColumnId) return;

    const column = columns?.find((c) => c.id === editingColumnId);
    let value: string | number | null = editValue;

    // Convert to number if column type is NUMBER
    if (column?.type === "NUMBER") {
      value = editValue === "" ? null : Number(editValue);
    }

    updateRow.mutate({
      id: editingRowId,
      data: { [editingColumnId]: value },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold">Row Router Test Page</h1>

      <div className="mb-8 grid grid-cols-2 gap-8">
        {/* ============================================ */}
        {/* LEFT: BASES */}
        {/* ============================================ */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-purple-400">
            1. Select a Base
          </h2>

          {basesLoading && <p className="text-gray-400">Loading...</p>}
          {bases?.length === 0 && (
            <p className="text-gray-400">
              No bases yet. Go to{" "}
              <a href="/test/base" className="text-purple-400 underline">
                /test/base
              </a>{" "}
              to create one.
            </p>
          )}
          <ul className="space-y-2">
            {bases?.map((base) => (
              <li
                key={base.id}
                className={`cursor-pointer rounded p-3 ${
                  selectedBaseId === base.id
                    ? "bg-purple-900"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
                onClick={() => {
                  setSelectedBaseId(base.id);
                  setSelectedTableId(null);
                }}
              >
                <p className="font-semibold">{base.name}</p>
                <p className="text-xs text-gray-400">{base.id}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ============================================ */}
        {/* RIGHT: TABLES */}
        {/* ============================================ */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-green-400">
            2. Select a Table
          </h2>

          {!selectedBaseId && (
            <p className="text-gray-400">Select a base first</p>
          )}

          {selectedBaseId && (
            <>
              {tablesLoading && <p className="text-gray-400">Loading...</p>}
              {tables?.length === 0 && (
                <p className="text-gray-400">
                  No tables yet. Create one at{" "}
                  <a href="/test/table" className="text-green-400 underline">
                    /test/table
                  </a>
                </p>
              )}
              <ul className="space-y-2">
                {tables?.map((table) => (
                  <li
                    key={table.id}
                    className={`cursor-pointer rounded p-3 ${
                      selectedTableId === table.id
                        ? "bg-green-900"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    <p className="font-semibold">{table.name}</p>
                    <p className="text-xs text-gray-400">{table.id}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION: Actions */}
      {/* ============================================ */}
      {selectedTableId && (
        <section className="mb-8 rounded-lg border border-green-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-green-400">
            3. Row Actions
          </h2>

          <div className="flex gap-4">
            <button
              onClick={() => {
                // Create empty row
                createRow.mutate({ tableId: selectedTableId });
              }}
              disabled={createRow.isPending}
              className="rounded bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:bg-gray-600"
            >
              {createRow.isPending ? "Creating..." : "+ Add Empty Row"}
            </button>

            <button
              onClick={() => {
                // Create row with sample data
                if (!columns || columns.length === 0) {
                  alert("No columns found");
                  return;
                }
                const sampleData: Record<string, string | number> = {};
                columns.forEach((col) => {
                  if (col.type === "NUMBER") {
                    sampleData[col.id] = Math.floor(Math.random() * 100);
                  } else {
                    sampleData[col.id] = `Sample ${Date.now()}`;
                  }
                });
                createRow.mutate({
                  tableId: selectedTableId,
                  data: sampleData,
                });
              }}
              disabled={createRow.isPending}
              className="rounded bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:bg-gray-600"
            >
              {createRow.isPending
                ? "Creating..."
                : "+ Add Row with Sample Data"}
            </button>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION: Display Rows as Table */}
      {/* ============================================ */}
      {selectedTableId && (
        <section className="mb-8 rounded-lg border border-blue-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-blue-400">
            4. Rows ({rows.length} loaded)
          </h2>

          {rowsLoading && <p className="text-gray-400">Loading rows...</p>}

          {rowsError && (
            <p className="text-red-400">Error: {rowsError.message}</p>
          )}

          {rows.length === 0 && !rowsLoading && (
            <p className="text-gray-400">No rows found. Create one above!</p>
          )}

          {rows.length > 0 && columns && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-600">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border border-gray-600 px-4 py-2 text-left">
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className="border border-gray-600 px-4 py-2 text-left"
                      >
                        {col.name}
                        <span className="ml-2 text-xs text-gray-400">
                          ({col.type})
                        </span>
                      </th>
                    ))}
                    <th className="border border-gray-600 px-4 py-2 text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-700">
                      <td className="border border-gray-600 px-4 py-2 text-gray-400">
                        {index + 1}
                      </td>
                      {columns.map((col) => {
                        const cellValue = getCellValue(
                          row.data as Record<string, unknown>,
                          col.id,
                        );
                        const isEditing =
                          editingRowId === row.id && editingColumnId === col.id;

                        return (
                          <td
                            key={col.id}
                            className="border border-gray-600 px-4 py-2"
                          >
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input
                                  type={
                                    col.type === "NUMBER" ? "number" : "text"
                                  }
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveCell();
                                    if (e.key === "Escape") {
                                      setEditingRowId(null);
                                      setEditingColumnId(null);
                                    }
                                  }}
                                  autoFocus
                                  className="w-full rounded border border-blue-500 bg-gray-800 px-2 py-1"
                                />
                                <button
                                  onClick={handleSaveCell}
                                  className="rounded bg-green-500 px-2 py-1 text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() =>
                                  handleCellClick(row.id, col.id, cellValue)
                                }
                                className="block cursor-pointer rounded px-1 hover:bg-gray-600"
                              >
                                {cellValue || (
                                  <span className="text-gray-500">empty</span>
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-600 px-4 py-2">
                        <button
                          onClick={() => {
                            if (confirm("Delete this row?")) {
                              deleteRow.mutate({ id: row.id });
                            }
                          }}
                          disabled={deleteRow.isPending}
                          className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:bg-gray-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600 disabled:bg-gray-600"
                  >
                    {isFetchingNextPage ? "Loading more..." : "Load More Rows"}
                  </button>
                </div>
              )}

              {!hasNextPage && rows.length > 0 && (
                <p className="mt-4 text-center text-gray-400">
                  All rows loaded
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION: Instructions */}
      {/* ============================================ */}
      <section className="rounded-lg border border-blue-300 bg-blue-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">
          How to Use This Test Page
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Select a base from the left panel</li>
          <li>Select a table from the right panel</li>
          <li>
            Click &quot;Add Empty Row&quot; or &quot;Add Row with Sample
            Data&quot;
          </li>
          <li>Click on any cell to edit its value</li>
          <li>Press Enter to save, Escape to cancel</li>
          <li>Click &quot;Load More Rows&quot; to test infinite pagination</li>
        </ol>

        <div className="mt-4 space-x-4">
          <a
            href="/test/column"
            className="text-blue-300 underline hover:text-blue-200"
          >
            Column Test Page
          </a>
          <a
            href="/test/table"
            className="text-blue-300 underline hover:text-blue-200"
          >
            Table Test Page
          </a>
        </div>
      </section>
    </div>
  );
}

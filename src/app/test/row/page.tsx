"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function RowTestPage() {
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const {
    data: rowsData,
    isLoading: rowsLoading,
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

  const rows = rowsData?.pages.flatMap((page) => page.items) ?? [];

  const createRow = api.row.create.useMutation({
    onSuccess: () => void refetchRows(),
  });

  const updateRow = api.row.update.useMutation({
    onSuccess: () => {
      setEditingRowId(null);
      setEditingColumnId(null);
      setEditValue("");
      void refetchRows();
    },
  });

  const deleteRow = api.row.delete.useMutation({
    onSuccess: () => void refetchRows(),
  });

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

  const handleSaveCell = () => {
    if (!editingRowId || !editingColumnId) return;
    const column = columns?.find((c) => c.id === editingColumnId);
    let value: string | number | null = editValue;
    if (column?.type === "NUMBER") {
      value = editValue === "" ? null : Number(editValue);
    }
    updateRow.mutate({ id: editingRowId, data: { [editingColumnId]: value } });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Row Test</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          marginTop: "30px",
        }}
      >
        <div>
          <h2>1. Select Base</h2>
          {basesLoading && <p>Loading...</p>}
          {bases?.length === 0 && (
            <p>
              No bases. <a href="/test/base">Create one</a>
            </p>
          )}

          {bases?.map((base) => (
            <div
              key={base.id}
              onClick={() => {
                setSelectedBaseId(base.id);
                setSelectedTableId(null);
              }}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                marginBottom: "10px",
                cursor: "pointer",
                background: selectedBaseId === base.id ? "#f0f0f0" : "white",
              }}
            >
              <strong>{base.name}</strong>
            </div>
          ))}
        </div>

        <div>
          <h2>2. Select Table</h2>
          {!selectedBaseId && <p>← Select a base first</p>}
          {selectedBaseId && (
            <>
              {tablesLoading && <p>Loading...</p>}
              {tables?.length === 0 && (
                <p>
                  No tables. <a href="/test/table">Create one</a>
                </p>
              )}

              {tables?.map((table) => (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  style={{
                    border: "1px solid #ccc",
                    padding: "15px",
                    marginBottom: "10px",
                    cursor: "pointer",
                    background:
                      selectedTableId === table.id ? "#f0f0f0" : "white",
                  }}
                >
                  <strong>{table.name}</strong>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedTableId && (
        <>
          <section style={{ marginTop: "30px" }}>
            <h2>3. Row Actions</h2>
            <button
              onClick={() => createRow.mutate({ tableId: selectedTableId })}
              disabled={createRow.isPending}
            >
              {createRow.isPending ? "Creating..." : "+ Add Row"}
            </button>
          </section>

          <section style={{ marginTop: "30px" }}>
            <h2>4. Rows ({rows.length})</h2>
            {rowsLoading && <p>Loading...</p>}
            {rows.length === 0 && !rowsLoading && <p>No rows yet</p>}

            {rows.length > 0 && columns && (
              <>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "10px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0f0f0" }}>
                      <th
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "left",
                        }}
                      >
                        #
                      </th>
                      {columns.map((col) => (
                        <th
                          key={col.id}
                          style={{
                            border: "1px solid #ccc",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {col.name} ({col.type})
                        </th>
                      ))}
                      <th
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "left",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.id}>
                        <td
                          style={{ border: "1px solid #ccc", padding: "8px" }}
                        >
                          {index + 1}
                        </td>
                        {columns.map((col) => {
                          const cellValue = getCellValue(
                            row.data as Record<string, unknown>,
                            col.id,
                          );
                          const isEditing =
                            editingRowId === row.id &&
                            editingColumnId === col.id;

                          return (
                            <td
                              key={col.id}
                              style={{
                                border: "1px solid #ccc",
                                padding: "8px",
                              }}
                            >
                              {isEditing ? (
                                <div>
                                  <input
                                    type={
                                      col.type === "NUMBER" ? "number" : "text"
                                    }
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveCell();
                                      if (e.key === "Escape") {
                                        setEditingRowId(null);
                                        setEditingColumnId(null);
                                      }
                                    }}
                                    autoFocus
                                    style={{ width: "100%", padding: "4px" }}
                                  />
                                  <button
                                    onClick={handleSaveCell}
                                    style={{ marginTop: "5px" }}
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <span
                                  onClick={() => {
                                    setEditingRowId(row.id);
                                    setEditingColumnId(col.id);
                                    setEditValue(cellValue);
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    display: "block",
                                  }}
                                >
                                  {cellValue || (
                                    <span style={{ color: "#999" }}>empty</span>
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td
                          style={{ border: "1px solid #ccc", padding: "8px" }}
                        >
                          <button
                            onClick={() => {
                              if (confirm("Delete?"))
                                deleteRow.mutate({ id: row.id });
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    style={{ marginTop: "15px" }}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More"}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}

      <div style={{ marginTop: "30px" }}>
        <a href="/test/column">Column Test</a> |{" "}
        <a href="/test/table">Table Test</a>
      </div>
    </div>
  );
}

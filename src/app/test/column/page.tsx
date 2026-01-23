"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function ColumnTestPage() {
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<"TEXT" | "NUMBER">("TEXT");
  const [updateColumnId, setUpdateColumnId] = useState("");
  const [updateName, setUpdateName] = useState("");

  const { data: bases, isLoading: basesLoading } = api.base.getAll.useQuery();
  const { data: tables, isLoading: tablesLoading } =
    api.table.getAllByBase.useQuery(
      { baseId: selectedBaseId! },
      { enabled: !!selectedBaseId },
    );
  const {
    data: columns,
    isLoading: columnsLoading,
    refetch: refetchColumns,
  } = api.column.getAllByTable.useQuery(
    { tableId: selectedTableId! },
    { enabled: !!selectedTableId },
  );

  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      setColumnName("");
      void refetchColumns();
    },
  });

  const updateColumn = api.column.update.useMutation({
    onSuccess: () => {
      setUpdateColumnId("");
      setUpdateName("");
      void refetchColumns();
    },
  });

  const deleteColumn = api.column.delete.useMutation({
    onSuccess: () => void refetchColumns(),
  });

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Column Test</h1>

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
              No bases. <a href="/test/table">Create one</a>
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
              <div style={{ fontSize: "12px", color: "#666" }}>{base.id}</div>
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
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {table.id}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedTableId && (
        <>
          <section style={{ marginTop: "30px" }}>
            <h2>3. Current Columns</h2>
            {columnsLoading && <p>Loading...</p>}
            {columns?.length === 0 && <p>No columns yet</p>}

            {columns?.map((column) => (
              <div
                key={column.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "15px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{column.name}</strong>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Type: {column.type} | Order: {column.order}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setUpdateColumnId(column.id);
                        setUpdateName(column.name);
                      }}
                      style={{ marginRight: "5px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete?"))
                          deleteColumn.mutate({ id: column.id });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section style={{ marginTop: "30px" }}>
            <h2>4. Create Column</h2>
            <div>
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Column name"
                style={{ padding: "8px", marginRight: "10px", width: "200px" }}
              />
              <select
                value={columnType}
                onChange={(e) =>
                  setColumnType(e.target.value as "TEXT" | "NUMBER")
                }
                style={{ padding: "8px", marginRight: "10px" }}
              >
                <option value="TEXT">TEXT</option>
                <option value="NUMBER">NUMBER</option>
              </select>
              <button
                onClick={() => {
                  if (columnName.trim()) {
                    createColumn.mutate({
                      tableId: selectedTableId,
                      name: columnName,
                      type: columnType,
                    });
                  }
                }}
                disabled={createColumn.isPending}
              >
                {createColumn.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </section>

          {updateColumnId && (
            <section
              style={{
                marginTop: "30px",
                border: "2px solid #f90",
                padding: "20px",
              }}
            >
              <h2>5. Update Column</h2>
              <input
                type="text"
                value={updateName}
                onChange={(e) => setUpdateName(e.target.value)}
                placeholder="New name"
                style={{ padding: "8px", marginRight: "10px", width: "200px" }}
              />
              <button
                onClick={() => {
                  if (updateName.trim()) {
                    updateColumn.mutate({
                      id: updateColumnId,
                      name: updateName,
                    });
                  }
                }}
                disabled={updateColumn.isPending}
                style={{ marginRight: "5px" }}
              >
                {updateColumn.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setUpdateColumnId("");
                  setUpdateName("");
                }}
              >
                Cancel
              </button>
            </section>
          )}
        </>
      )}

      <div style={{ marginTop: "30px" }}>
        <a href="/test/table">← Back to Table Test</a>
      </div>
    </div>
  );
}

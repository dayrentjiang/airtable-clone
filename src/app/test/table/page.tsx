"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function TableTestPage() {
  const [baseName, setBaseName] = useState("");
  const [tableName, setTableName] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  const { data: workspaces } = api.workspace.getAll.useQuery();
  const defaultWorkspaceId = workspaces?.[0]?.id;

  const {
    data: bases,
    isLoading: basesLoading,
    refetch: refetchBases,
  } = api.base.getAll.useQuery();

  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      setBaseName("");
      void refetchBases();
    },
  });

  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => {
      if (selectedBaseId) setSelectedBaseId(null);
      void refetchBases();
    },
  });

  const {
    data: tables,
    isLoading: tablesLoading,
    refetch: refetchTables,
  } = api.table.getAllByBase.useQuery(
    { baseId: selectedBaseId! },
    { enabled: !!selectedBaseId },
  );

  const createTable = api.table.create.useMutation({
    onSuccess: () => {
      setTableName("");
      void refetchTables();
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onSuccess: () => void refetchTables(),
  });

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Table Test</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          marginTop: "30px",
        }}
      >
        <div>
          <h2>Bases</h2>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="New base name"
              style={{ padding: "8px", marginRight: "10px", width: "200px" }}
            />
            <button
              onClick={() => {
                if (baseName.trim() && defaultWorkspaceId) {
                  createBase.mutate({
                    name: baseName,
                    workspaceId: defaultWorkspaceId,
                  });
                }
              }}
              disabled={createBase.isPending}
            >
              {createBase.isPending ? "..." : "Create"}
            </button>
          </div>

          {basesLoading && <p>Loading...</p>}
          {bases?.length === 0 && <p>No bases yet</p>}

          {bases?.map((base) => (
            <div
              key={base.id}
              onClick={() => setSelectedBaseId(base.id)}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                marginBottom: "10px",
                cursor: "pointer",
                background: selectedBaseId === base.id ? "#f0f0f0" : "white",
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
                  <strong>{base.name}</strong>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {base.id}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBase.mutate({ id: base.id });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2>Tables {selectedBaseId && "(in selected base)"}</h2>
          {!selectedBaseId && <p>← Select a base to see its tables</p>}

          {selectedBaseId && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="New table name"
                  style={{
                    padding: "8px",
                    marginRight: "10px",
                    width: "200px",
                  }}
                />
                <button
                  onClick={() => {
                    if (tableName.trim() && selectedBaseId) {
                      createTable.mutate({
                        baseId: selectedBaseId,
                        name: tableName,
                      });
                    }
                  }}
                  disabled={createTable.isPending}
                >
                  {createTable.isPending ? "..." : "Create"}
                </button>
              </div>

              {tablesLoading && <p>Loading...</p>}
              {tables?.length === 0 && <p>No tables yet</p>}

              {tables?.map((table) => (
                <div
                  key={table.id}
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
                      <strong>{table.name}</strong>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {table.id}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTable.mutate({ id: table.id })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: "30px" }}>
        <Link href="/">← Back to Home</Link>
      </div>
    </div>
  );
}

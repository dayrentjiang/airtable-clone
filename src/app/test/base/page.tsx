"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function BaseTestPage() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [baseName, setBaseName] = useState("");

  const { data: workspaces, isLoading: workspacesLoading } =
    api.workspace.getAll.useQuery();
  const {
    data: bases,
    isLoading: basesLoading,
    refetch,
  } = api.base.getAll.useQuery();

  const filteredBases =
    bases?.filter((b) => b.workspaceId === selectedWorkspaceId) ?? [];

  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      setBaseName("");
      void refetch();
    },
  });

  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Base Test</h1>

      <section style={{ marginTop: "30px" }}>
        <h2>1. Select Workspace</h2>
        {workspacesLoading && <p>Loading...</p>}
        {workspaces?.length === 0 && (
          <p>
            No workspaces. <a href="/test/workspace">Create one</a>
          </p>
        )}

        <div style={{ marginTop: "10px" }}>
          {workspaces?.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkspaceId(ws.id)}
              style={{
                padding: "10px 15px",
                marginRight: "10px",
                marginBottom: "10px",
                background:
                  selectedWorkspaceId === ws.id ? "#4a5568" : "#e2e8f0",
                border: "none",
                cursor: "pointer",
              }}
            >
              {ws.starred && "⭐ "}
              {ws.name}
            </button>
          ))}
        </div>
      </section>

      {selectedWorkspaceId && (
        <>
          <section style={{ marginTop: "30px" }}>
            <h2>2. Create Base</h2>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Base name"
              style={{ padding: "8px", marginRight: "10px", width: "300px" }}
            />
            <button
              onClick={() => {
                if (baseName.trim()) {
                  createBase.mutate({
                    name: baseName,
                    workspaceId: selectedWorkspaceId,
                  });
                }
              }}
              disabled={!baseName || createBase.isPending}
            >
              {createBase.isPending ? "Creating..." : "Create Base"}
            </button>
          </section>

          <section style={{ marginTop: "30px" }}>
            <h2>3. Bases ({filteredBases.length})</h2>
            {basesLoading && <p>Loading...</p>}
            {filteredBases.length === 0 && !basesLoading && <p>No bases yet</p>}

            {filteredBases.map((base) => (
              <div
                key={base.id}
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
                    <strong>{base.name}</strong>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {base.id}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Delete?"))
                        deleteBase.mutate({ id: base.id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      <div style={{ marginTop: "30px" }}>
        <a href="/test/workspace">Workspace Test</a> |{" "}
        <a href="/test/table">Table Test</a>
      </div>
    </div>
  );
}

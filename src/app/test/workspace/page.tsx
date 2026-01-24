"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { LogoutButton } from "~/app/_components/ui/LogoutButton";

export default function WorkspaceTestPage() {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const {
    data: workspaces,
    isLoading,
    refetch,
  } = api.workspace.getAll.useQuery();

  const createWorkspace = api.workspace.create.useMutation({
    onSuccess: () => {
      setName("");
      void refetch();
    },
  });

  const updateWorkspace = api.workspace.update.useMutation({
    onSuccess: () => {
      setEditId(null);
      setEditName("");
      void refetch();
    },
  });

  const deleteWorkspace = api.workspace.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
        }}
      >
        <h1>Workspace Test</h1>
        <LogoutButton />
      </div>

      <section style={{ marginBottom: "30px" }}>
        <h2>Create Workspace</h2>
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            style={{ padding: "8px", marginRight: "10px", width: "300px" }}
          />
          <button
            onClick={() => createWorkspace.mutate({ name })}
            disabled={!name || createWorkspace.isPending}
          >
            {createWorkspace.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </section>

      <section>
        <h2>Workspaces ({workspaces?.length ?? 0})</h2>
        {isLoading && <p>Loading...</p>}
        {workspaces?.length === 0 && <p>No workspaces yet</p>}

        {workspaces?.map((ws) => (
          <div
            key={ws.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "10px",
            }}
          >
            {editId === ws.id ? (
              <div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ padding: "5px", marginRight: "10px" }}
                />
                <button
                  onClick={() =>
                    updateWorkspace.mutate({ id: ws.id, name: editName })
                  }
                >
                  Save
                </button>
                <button
                  onClick={() => setEditId(null)}
                  style={{ marginLeft: "5px" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>
                    {ws.starred && "⭐ "}
                    {ws.name}
                  </strong>
                  <div style={{ fontSize: "12px", color: "#666" }}>{ws.id}</div>
                </div>
                <div>
                  <button
                    onClick={() =>
                      updateWorkspace.mutate({
                        id: ws.id,
                        starred: !ws.starred,
                      })
                    }
                    style={{ marginRight: "5px" }}
                  >
                    {ws.starred ? "Unstar" : "Star"}
                  </button>
                  <button
                    onClick={() => {
                      setEditId(ws.id);
                      setEditName(ws.name);
                    }}
                    style={{ marginRight: "5px" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete?"))
                        deleteWorkspace.mutate({ id: ws.id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <div style={{ marginTop: "30px" }}>
        <Link href="/test/base" className="text-blue-600 hover:underline">Base Test</Link> |{" "}
        <Link href="/test/table" className="text-blue-600 hover:underline">Table Test</Link> | <Link href="/test/row" className="text-blue-600 hover:underline">Row Test</Link>
      </div>
    </div>
  );
}

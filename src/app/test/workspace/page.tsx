"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { LogoutButton } from "~/app/_components/ui/LogoutButton";

export default function WorkspaceTestPage() {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Query
  const { data: workspaces, isLoading, refetch } = api.workspace.getAll.useQuery();

  // Mutations
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
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workspace Test Page</h1>
        <LogoutButton />
      </div>

      {/* Create */}
      <section className="mb-8 rounded-lg border border-green-500 bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold text-green-400">Create Workspace</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className="flex-1 rounded border border-gray-600 bg-gray-700 px-4 py-2"
          />
          <button
            onClick={() => createWorkspace.mutate({ name })}
            disabled={!name || createWorkspace.isPending}
            className="rounded bg-green-500 px-4 py-2 font-medium hover:bg-green-600 disabled:bg-gray-600"
          >
            {createWorkspace.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </section>

      {/* List */}
      <section className="rounded-lg border border-blue-500 bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold text-blue-400">
          Workspaces ({workspaces?.length ?? 0})
        </h2>

        {isLoading && <p className="text-gray-400">Loading...</p>}

        {workspaces?.length === 0 && (
          <p className="text-gray-400">No workspaces yet</p>
        )}

        <div className="space-y-3">
          {workspaces?.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center justify-between rounded border border-gray-600 bg-gray-700 p-4"
            >
              {editId === ws.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-gray-500 bg-gray-600 px-3 py-1"
                  />
                  <button
                    onClick={() => updateWorkspace.mutate({ id: ws.id, name: editName })}
                    className="rounded bg-green-500 px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded bg-gray-500 px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">
                      {ws.starred && <span className="mr-2">⭐</span>}
                      {ws.name}
                    </p>
                    <p className="text-xs text-gray-400">{ws.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateWorkspace.mutate({ id: ws.id, starred: !ws.starred })}
                      className="rounded bg-yellow-500 px-3 py-1 text-sm hover:bg-yellow-600"
                    >
                      {ws.starred ? "Unstar" : "Star"}
                    </button>
                    <button
                      onClick={() => {
                        setEditId(ws.id);
                        setEditName(ws.name);
                      }}
                      className="rounded bg-blue-500 px-3 py-1 text-sm hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this workspace?")) {
                          deleteWorkspace.mutate({ id: ws.id });
                        }
                      }}
                      className="rounded bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <div className="mt-8 space-x-4">
        <a href="/test/base" className="text-blue-300 underline">Base Test</a>
        <a href="/test/table" className="text-blue-300 underline">Table Test</a>
        <a href="/test/row" className="text-blue-300 underline">Row Test</a>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function BaseTestPage() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [baseName, setBaseName] = useState("");

  // Query: Get all workspaces
  const { data: workspaces, isLoading: workspacesLoading } = api.workspace.getAll.useQuery();

  // Query: Get bases for selected workspace
  const { data: bases, isLoading: basesLoading, refetch } = api.base.getAll.useQuery(
    undefined,
    { enabled: !!selectedWorkspaceId }
  );

  // Filter bases by selected workspace
  const filteredBases = bases?.filter((b) => b.workspaceId === selectedWorkspaceId) ?? [];

  // Mutation: Create a base
  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      setBaseName("");
      void refetch();
    },
  });

  // Mutation: Delete a base
  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold">Base Test Page</h1>

      {/* Select Workspace */}
      <section className="mb-8 rounded-lg border border-purple-500 bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold text-purple-400">1. Select Workspace</h2>

        {workspacesLoading && <p className="text-gray-400">Loading...</p>}

        {workspaces?.length === 0 && (
          <p className="text-gray-400">
            No workspaces yet. Create one at{" "}
            <a href="/test/workspace" className="text-purple-400 underline">/test/workspace</a>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {workspaces?.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkspaceId(ws.id)}
              className={`rounded px-4 py-2 ${
                selectedWorkspaceId === ws.id
                  ? "bg-purple-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {ws.starred && "⭐ "}{ws.name}
            </button>
          ))}
        </div>
      </section>

      {/* Create Base */}
      {selectedWorkspaceId && (
        <section className="mb-8 rounded-lg border border-green-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-green-400">2. Create Base</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Base name"
              className="flex-1 rounded border border-gray-600 bg-gray-700 px-4 py-2"
            />
            <button
              onClick={() => {
                if (baseName.trim()) {
                  createBase.mutate({ name: baseName, workspaceId: selectedWorkspaceId });
                }
              }}
              disabled={!baseName || createBase.isPending}
              className="rounded bg-green-500 px-4 py-2 font-medium hover:bg-green-600 disabled:bg-gray-600"
            >
              {createBase.isPending ? "Creating..." : "Create Base"}
            </button>
          </div>
        </section>
      )}

      {/* List Bases */}
      {selectedWorkspaceId && (
        <section className="rounded-lg border border-blue-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-blue-400">
            3. Bases ({filteredBases.length})
          </h2>

          {basesLoading && <p className="text-gray-400">Loading...</p>}

          {filteredBases.length === 0 && !basesLoading && (
            <p className="text-gray-400">No bases in this workspace yet</p>
          )}

          <div className="space-y-3">
            {filteredBases.map((base) => (
              <div
                key={base.id}
                className="flex items-center justify-between rounded border border-gray-600 bg-gray-700 p-4"
              >
                <div>
                  <p className="font-medium">{base.name}</p>
                  <p className="text-xs text-gray-400">{base.id}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete this base?")) {
                      deleteBase.mutate({ id: base.id });
                    }
                  }}
                  className="rounded bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Links */}
      <div className="mt-8 space-x-4">
        <a href="/test/workspace" className="text-blue-300 underline">Workspace Test</a>
        <a href="/test/table" className="text-blue-300 underline">Table Test</a>
      </div>
    </div>
  );
}

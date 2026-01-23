"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function TestPage() {
  const [baseName, setBaseName] = useState("");
  const [tableName, setTableName] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  // ========== BASE QUERIES ==========
  const { data: bases, isLoading: basesLoading, refetch: refetchBases } = api.base.getAll.useQuery();

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

  // ========== TABLE QUERIES ==========
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables } = api.table.getAllByBase.useQuery(
    { baseId: selectedBaseId! },
    { enabled: !!selectedBaseId } // Only run query when a base is selected
  );

  const createTable = api.table.create.useMutation({
    onSuccess: () => {
      setTableName("");
      void refetchTables();
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onSuccess: () => {
      void refetchTables();
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold">tRPC Test Page</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* ========== LEFT: BASES ========== */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-purple-400">Bases</h2>

          {/* Create Base Form */}
          <div className="mb-4 rounded-lg bg-gray-800 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (baseName.trim()) createBase.mutate({ name: baseName });
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="New base name..."
                className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={createBase.isPending}
                className="rounded bg-purple-600 px-4 py-2 text-sm hover:bg-purple-700"
              >
                {createBase.isPending ? "..." : "Create"}
              </button>
            </form>
          </div>

          {/* List Bases */}
          {basesLoading && <p className="text-gray-400">Loading...</p>}
          {bases?.length === 0 && <p className="text-gray-400">No bases yet</p>}
          <ul className="space-y-2">
            {bases?.map((base) => (
              <li
                key={base.id}
                className={`flex items-center justify-between rounded p-3 cursor-pointer ${
                  selectedBaseId === base.id ? "bg-purple-900" : "bg-gray-800 hover:bg-gray-700"
                }`}
                onClick={() => setSelectedBaseId(base.id)}
              >
                <div>
                  <p className="font-semibold">{base.name}</p>
                  <p className="text-xs text-gray-400">{base.id}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBase.mutate({ id: base.id });
                  }}
                  className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ========== RIGHT: TABLES ========== */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-green-400">
            Tables {selectedBaseId && `(in selected base)`}
          </h2>

          {!selectedBaseId && (
            <p className="text-gray-400">← Select a base to see its tables</p>
          )}

          {selectedBaseId && (
            <>
              {/* Create Table Form */}
              <div className="mb-4 rounded-lg bg-gray-800 p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (tableName.trim() && selectedBaseId) {
                      createTable.mutate({ baseId: selectedBaseId, name: tableName });
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="New table name..."
                    className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={createTable.isPending}
                    className="rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
                  >
                    {createTable.isPending ? "..." : "Create"}
                  </button>
                </form>
              </div>

              {/* List Tables */}
              {tablesLoading && <p className="text-gray-400">Loading...</p>}
              {tables?.length === 0 && <p className="text-gray-400">No tables yet</p>}
              <ul className="space-y-2">
                {tables?.map((table) => (
                  <li
                    key={table.id}
                    className="flex items-center justify-between rounded bg-gray-800 p-3"
                  >
                    <div>
                      <p className="font-semibold">{table.name}</p>
                      <p className="text-xs text-gray-400">{table.id}</p>
                    </div>
                    <button
                      onClick={() => deleteTable.mutate({ id: table.id })}
                      className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Back link */}
      <a href="/" className="mt-8 inline-block text-purple-400 hover:text-purple-300">
        ← Back to Home
      </a>
    </div>
  );
}

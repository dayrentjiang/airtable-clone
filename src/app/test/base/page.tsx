"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function TestPage() {
  const [baseName, setBaseName] = useState("");

  // Query: Get all bases
  const { data: bases, isLoading, refetch } = api.base.getAll.useQuery();

  // Mutation: Create a base
  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      setBaseName("");
      void refetch(); // Refresh the list
    },
  });

  // Mutation: Delete a base
  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold">tRPC Test Page - Base Router</h1>

      {/* Create Base Form */}
      <div className="mb-8 rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold">Create Base</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (baseName.trim()) {
              createBase.mutate({ name: baseName });
            }
          }}
          className="flex gap-4"
        >
          <input
            type="text"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            placeholder="Enter base name..."
            className="flex-1 rounded bg-gray-700 px-4 py-2 text-white"
          />
          <button
            type="submit"
            disabled={createBase.isPending}
            className="rounded bg-purple-600 px-6 py-2 font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {createBase.isPending ? "Creating..." : "Create Base"}
          </button>
        </form>
        {createBase.error && (
          <p className="mt-2 text-red-400">Error: {createBase.error.message}</p>
        )}
      </div>

      {/* List Bases */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold">Your Bases</h2>

        {isLoading && <p className="text-gray-400">Loading...</p>}

        {bases && bases.length === 0 && (
          <p className="text-gray-400">No bases yet. Create one above!</p>
        )}

        {bases && bases.length > 0 && (
          <ul className="space-y-2">
            {bases.map((base) => (
              <li
                key={base.id}
                className="flex items-center justify-between rounded bg-gray-700 p-4"
              >
                <div>
                  <p className="font-semibold">{base.name}</p>
                  <p className="text-sm text-gray-400">ID: {base.id}</p>
                  <p className="text-sm text-gray-400">
                    Created: {new Date(base.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteBase.mutate({ id: base.id })}
                  disabled={deleteBase.isPending}
                  className="rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-8 inline-block text-purple-400 hover:text-purple-300"
      >
        ← Back to Home
      </a>
    </div>
  );
}

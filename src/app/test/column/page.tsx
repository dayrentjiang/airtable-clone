"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * TEST PAGE FOR COLUMN ROUTER
 * 
 * This page demonstrates all column operations:
 * 1. Get all columns for a table
 * 2. Create a new column
 * 3. Update a column (rename/change type)
 * 4. Delete a column
 * 5. Reorder columns
 */

export default function ColumnTestPage() {
  // State for base and table selection
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // State for column operations
  const [columnName, setColumnName] = useState("New Column");
  const [columnType, setColumnType] = useState<"TEXT" | "NUMBER">("TEXT");
  const [updateColumnId, setUpdateColumnId] = useState("");
  const [updateName, setUpdateName] = useState("");

  // ============================================
  // QUERIES: Get bases and tables
  // ============================================
  const { data: bases, isLoading: basesLoading } = api.base.getAll.useQuery();
  
  const { data: tables, isLoading: tablesLoading } = api.table.getAllByBase.useQuery(
    { baseId: selectedBaseId! },
    { enabled: !!selectedBaseId }
  );

  // ============================================
  // QUERY: Get all columns for a table
  // ============================================
  const { 
    data: columns, 
    isLoading: columnsLoading,
    error: columnsError,
    refetch: refetchColumns 
  } = api.column.getAllByTable.useQuery(
    { tableId: selectedTableId! },
    { enabled: !!selectedTableId } // Only fetch if tableId is provided
  );

  // ============================================
  // MUTATION: Create a new column
  // ============================================
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      alert("✅ Column created successfully!");
      refetchColumns(); // Refresh the columns list
      setColumnName(""); // Clear input
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  // ============================================
  // MUTATION: Update a column
  // ============================================
  const updateColumn = api.column.update.useMutation({
    onSuccess: () => {
      alert("✅ Column updated successfully!");
      refetchColumns();
      setUpdateColumnId("");
      setUpdateName("");
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  // ============================================
  // MUTATION: Delete a column
  // ============================================
  const deleteColumn = api.column.delete.useMutation({
    onSuccess: () => {
      alert("✅ Column deleted successfully!");
      refetchColumns();
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold">🧪 Column Router Test Page</h1>

      <div className="mb-8 grid grid-cols-2 gap-8">
        {/* ============================================ */}
        {/* LEFT: BASES */}
        {/* ============================================ */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-purple-400">
            1️⃣ Select a Base
          </h2>
          
          {basesLoading && <p className="text-gray-400">Loading...</p>}
          {bases?.length === 0 && (
            <p className="text-gray-400">
              No bases yet. Go to <a href="/test/table" className="text-purple-400 underline">/test/table</a> to create one.
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
                  setSelectedTableId(null); // Reset table selection
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
            2️⃣ Select a Table
          </h2>
          
          {!selectedBaseId && (
            <p className="text-gray-400">← Select a base first</p>
          )}
          
          {selectedBaseId && (
            <>
              {tablesLoading && <p className="text-gray-400">Loading...</p>}
              {tables?.length === 0 && (
                <p className="text-gray-400">
                  No tables yet. Create one at <a href="/test/table" className="text-green-400 underline">/test/table</a>
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
      {/* SECTION: Display Columns */}
      {/* ============================================ */}
      {selectedTableId && (
        <section className="mb-8 rounded-lg border border-blue-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-blue-400">3️⃣ Current Columns</h2>
          
          {columnsLoading && (
            <p className="text-gray-400">Loading columns...</p>
          )}
          
          {columnsError && (
            <p className="text-red-400">Error: {columnsError.message}</p>
          )}
          
          {columns && columns.length === 0 && (
            <p className="text-gray-400">No columns found. Create one below!</p>
          )}
          
          {columns && columns.length > 0 && (
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between rounded border border-gray-600 bg-gray-700 p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{column.name}</p>
                    <p className="text-sm text-gray-400">
                      Type: {column.type} | Order: {column.order} | ID: {column.id}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Update Button */}
                    <button
                      onClick={() => {
                        setUpdateColumnId(column.id);
                        setUpdateName(column.name);
                      }}
                      className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                    >
                      ✏️ Edit
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete column "${column.name}"?`)) {
                          deleteColumn.mutate({ id: column.id });
                        }
                      }}
                      disabled={deleteColumn.isPending}
                      className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:bg-gray-600"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION: Create Column */}
      {/* ============================================ */}
      {selectedTableId && (
        <section className="mb-8 rounded-lg border border-green-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-green-400">4️⃣ Create New Column</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Column Name</label>
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="e.g., Email, Age, Status"
                className="w-full rounded border border-gray-600 bg-gray-700 px-4 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium">Column Type</label>
              <select
                value={columnType}
                onChange={(e) => setColumnType(e.target.value as "TEXT" | "NUMBER")}
                className="w-full rounded border border-gray-600 bg-gray-700 px-4 py-2 focus:border-green-500 focus:outline-none"
              >
                <option value="TEXT">TEXT</option>
                <option value="NUMBER">NUMBER</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                if (!columnName.trim()) {
                  alert("Please enter a column name");
                  return;
                }
                createColumn.mutate({
                  tableId: selectedTableId,
                  name: columnName,
                  type: columnType,
                });
              }}
              disabled={createColumn.isPending}
              className="w-full rounded bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:bg-gray-600"
            >
              {createColumn.isPending ? "Creating..." : "➕ Create Column"}
            </button>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION: Update Column */}
      {/* ============================================ */}
      {updateColumnId && (
        <section className="mb-8 rounded-lg border border-yellow-500 bg-gray-800 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-yellow-400">5️⃣ Update Column</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">New Name</label>
              <input
                type="text"
                value={updateName}
                onChange={(e) => setUpdateName(e.target.value)}
                placeholder="Enter new name"
                className="w-full rounded border border-gray-600 bg-gray-700 px-4 py-2 focus:border-yellow-500 focus:outline-none"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!updateName.trim()) {
                    alert("Please enter a new name");
                    return;
                  }
                  updateColumn.mutate({
                    id: updateColumnId,
                    name: updateName,
                  });
                }}
                disabled={updateColumn.isPending}
                className="flex-1 rounded bg-yellow-500 px-4 py-2 font-medium hover:bg-yellow-600 disabled:bg-gray-600"
              >
                {updateColumn.isPending ? "Updating..." : "💾 Save Changes"}
              </button>
              
              <button
                onClick={() => {
                  setUpdateColumnId("");
                  setUpdateName("");
                }}
                className="rounded bg-gray-600 px-4 py-2 font-medium hover:bg-gray-500"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION: Instructions */}
      {/* ============================================ */}
      <section className="rounded-lg border border-blue-300 bg-blue-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">📖 How to Use This Test Page</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Select a base from the left panel</li>
          <li>Select a table from the right panel</li>
          <li>You'll see the default columns created with the table</li>
          <li>Try creating new columns with different names and types</li>
          <li>Edit a column by clicking the "✏️ Edit" button</li>
          <li>Delete columns using the "🗑️ Delete" button</li>
        </ol>
        
        <div className="mt-4">
          <a href="/test/table" className="text-blue-300 underline hover:text-blue-200">
            ← Back to Table Test Page
          </a>
        </div>
      </section>
    </div>
  );
}

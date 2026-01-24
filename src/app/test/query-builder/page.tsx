"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import type { Filter, Sort } from "~/server/lib/types";

export default function QueryBuilderTestPage() {
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedViewId, setSelectedViewId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch workspaces
  const { data: workspaces } = api.workspace.getAll.useQuery();
  const firstWorkspace = workspaces?.[0];

  // Fetch bases for first workspace
  const { data: bases } = api.base.getAll.useQuery(undefined, {
    enabled: !!firstWorkspace,
  });

  // Fetch tables for selected base
  const { data: tables } = api.table.getAllByBase.useQuery(
    { baseId: selectedBaseId },
    { enabled: !!selectedBaseId },
  );

  // Fetch views for selected table
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: selectedTableId },
    { enabled: !!selectedTableId },
  );

  // Fetch rows with filters/sorts
  const { data: rowsData, isLoading: rowsLoading } =
    api.row.infiniteWithView.useQuery(
      {
        tableId: selectedTableId,
        viewId: selectedViewId || undefined,
        search: searchTerm || undefined,
        limit: 100,
        offset: 0,
      },
      { enabled: !!selectedTableId },
    );

  const rows = rowsData?.items ?? [];

  // Auto-select first base
  useEffect(() => {
    if (bases && bases.length > 0 && !selectedBaseId) {
      setSelectedBaseId(bases[0]!.id);
    }
  }, [bases, selectedBaseId]);

  // Get available column IDs from the first row
  const availableColumns = rows?.[0]?.data
    ? Object.keys(rows[0].data as Record<string, unknown>)
    : [];

  // Get selected view info
  const selectedView = views?.find((v) => v.id === selectedViewId);
  const viewConfig = selectedView?.config as
    | { filters?: Filter[]; sorts?: Sort[] }
    | null
    | undefined;
  const viewFilters = viewConfig?.filters ?? [];
  const viewSorts = viewConfig?.sorts ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Query Builder Test - Live Data
          </h1>
          <p className="text-gray-600">
            Test filters, sorts, and search with real data from your database.
          </p>
        </div>

        {/* Data Selection */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Select Data Source
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Base
              </label>
              <select
                value={selectedBaseId}
                onChange={(e) => {
                  setSelectedBaseId(e.target.value);
                  setSelectedTableId("");
                  setSelectedViewId("");
                }}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">Select a base...</option>
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Table
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => {
                  setSelectedTableId(e.target.value);
                  setSelectedViewId("");
                }}
                className="w-full rounded border border-gray-300 px-3 py-2"
                disabled={!selectedBaseId}
              >
                <option value="">Select a table...</option>
                {tables?.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                View (optional)
              </label>
              <select
                value={selectedViewId}
                onChange={(e) => setSelectedViewId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                disabled={!selectedTableId}
              >
                <option value="">No view (show all)</option>
                {views?.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search all columns..."
                className="w-full rounded border border-gray-300 px-3 py-2"
                disabled={!selectedTableId}
              />
            </div>
          </div>
          {selectedTableId && (
            <div className="mt-4 rounded bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Available Columns:</strong>{" "}
                {availableColumns.length > 0
                  ? availableColumns.join(", ")
                  : "No data yet - create some rows first!"}
              </p>
            </div>
          )}
        </div>

        {/* Active View Info */}
        {selectedView && (
          <div className="rounded-lg bg-indigo-50 p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold text-indigo-900">
              Active View: {selectedView.name}
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="mb-2 font-semibold text-indigo-800">Filters:</h3>
                {viewFilters.length > 0 ? (
                  <ul className="space-y-1">
                    {viewFilters.map((filter, idx) => (
                      <li key={idx} className="text-sm text-indigo-700">
                        • {filter.columnId} {filter.operator.replace(/_/g, " ")}{" "}
                        {filter.value !== undefined ? `"${filter.value}"` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-indigo-600">No filters</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-indigo-800">Sorts:</h3>
                {viewSorts.length > 0 ? (
                  <ul className="space-y-1">
                    {viewSorts.map((sort, idx) => (
                      <li key={idx} className="text-sm text-indigo-700">
                        • {sort.columnId} ({sort.direction})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-indigo-600">No sorts</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Results ({rows?.length ?? 0} rows)
          </h2>
          {rowsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : !selectedTableId ? (
            <p className="text-gray-500">Select a table to see results.</p>
          ) : rows && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Order
                    </th>
                    {availableColumns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {row.id.slice(0, 8)}...
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {row.order}
                      </td>
                      {availableColumns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-3 text-sm text-gray-900"
                        >
                          {JSON.stringify(
                            (row.data as Record<string, unknown>)[col] ?? null,
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">
                No rows found. Create some data in your table first!
              </p>
            </div>
          )}
        </div>

        {/* SQL Preview */}
        <div className="rounded-lg bg-gray-900 p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-green-400">
            SQL Query (Conceptual)
          </h2>
          <div className="font-mono text-sm">
            <div className="text-blue-400">SELECT</div>
            <div className="ml-4 text-white">
              id, tableId, data, "order", createdAt, updatedAt
            </div>
            <div className="text-blue-400">FROM</div>
            <div className="ml-4 text-white">"Row"</div>
            <div className="text-blue-400">WHERE</div>
            <div className="ml-4 text-white">
              tableId ={" "}
              <span className="text-yellow-400">
                '{selectedTableId || "..."}'
              </span>
            </div>
            {viewFilters.length > 0 && (
              <>
                <div className="ml-4 text-blue-400">AND</div>
                <div className="ml-8 text-gray-400">
                  -- {viewFilters.length} filter(s) applied to JSONB data column
                </div>
                {viewFilters.map((filter, idx) => (
                  <div key={idx} className="ml-8 text-green-300">
                    {filter.operator === "is_empty" ||
                    filter.operator === "is_not_empty"
                      ? `-- ${filter.columnId} ${filter.operator}`
                      : `-- ${filter.columnId} ${filter.operator} "${filter.value}"`}
                  </div>
                ))}
              </>
            )}
            {searchTerm && (
              <>
                <div className="ml-4 text-blue-400">AND</div>
                <div className="ml-8 text-yellow-300">
                  data::text ILIKE '%{searchTerm}%'
                </div>
              </>
            )}
            <div className="text-blue-400">ORDER BY</div>
            {viewSorts.length > 0 ? (
              <>
                {viewSorts.map((sort, idx) => (
                  <div key={idx} className="ml-8 text-purple-300">
                    (data-&gt;&gt;'{sort.columnId}'){" "}
                    {sort.direction.toUpperCase()}
                    {idx < viewSorts.length - 1 ? "," : ""}
                  </div>
                ))}
                <div className="ml-8 text-white">"order" ASC</div>
              </>
            ) : (
              <div className="ml-8 text-white">"order" ASC</div>
            )}
            <div className="text-gray-400">;</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-green-50 p-6 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-green-900">How to Test</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-green-800">
            <li>Select a table from the dropdown above</li>
            <li>
              (Optional) Select a view that has filters/sorts configured - go to
              /test/view to create views
            </li>
            <li>
              (Optional) Type in the search box to do full-text search across
              all columns
            </li>
            <li>Watch the results update in real-time!</li>
            <li>Check the SQL preview to see what query is being generated</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

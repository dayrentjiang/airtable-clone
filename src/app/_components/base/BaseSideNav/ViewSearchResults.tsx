"use client";

import { useRouter } from "next/navigation";
import { Grid } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  type: string;
  tableId: string;
  table: {
    id: string;
    name: string;
    baseId: string;
  };
}

interface ViewSearchResultsProps {
  baseId: string;
  currentTableViews?: SearchResult[];
  otherTableViews?: SearchResult[];
  onViewSelect?: (viewId: string) => void;
  onTableAndViewSelect?: (tableId: string, viewId: string) => void;
  selectedViewId?: string;
  isLoading?: boolean;
}

export function ViewSearchResults({
  baseId,
  currentTableViews = [],
  otherTableViews = [],
  onViewSelect,
  onTableAndViewSelect,
  selectedViewId,
  isLoading = false,
}: ViewSearchResultsProps) {
  const router = useRouter();

  const handleViewClick = (view: SearchResult) => {
    console.log('[ViewSearchResults] handleViewClick called with:', view);
    console.log('[ViewSearchResults] currentTableViews:', currentTableViews);
    console.log('[ViewSearchResults] onTableAndViewSelect:', onTableAndViewSelect);
    
    // If it's in the current table, just select it
    if (onViewSelect && currentTableViews.some((v) => v.id === view.id)) {
      console.log('[ViewSearchResults] View is in current table, calling onViewSelect');
      onViewSelect(view.id);
    } else {
      // Navigate to the different table/view
      console.log('[ViewSearchResults] View is in different table');
      if (onTableAndViewSelect) {
        console.log('[ViewSearchResults] Calling onTableAndViewSelect');
        // Use the callback to update both table and view
        onTableAndViewSelect(view.tableId, view.id);
      } else {
        console.log('[ViewSearchResults] Fallback to router.push');
        // Fallback to router navigation
        router.push(`/${baseId}?table=${view.tableId}&view=${view.id}`);
      }
    }
  };

  return (
    <div className="space-y-0">
      {/* Loading state */}
      {isLoading && (
        <div className="px-2.5 py-2 text-xs text-gray-500">Searching...</div>
      )}

      {/* Current table views */}
      {!isLoading && currentTableViews.length > 0 && (
        <>
          {currentTableViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewClick(view)}
              className={`flex h-8 w-full items-center gap-2 rounded px-2.5 text-left text-[13px] transition-colors hover:cursor-pointer ${
                view.id === selectedViewId
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Grid className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">{view.name}</span>
            </button>
          ))}
        </>
      )}

      {/* Other table views with separator */}
      {!isLoading && otherTableViews.length > 0 && (
        <>
          <div className="px-2.5 py-3 text-xs text-gray-500">
            {currentTableViews.length > 0
              ? `${otherTableViews.length} views from other tables`
              : "Views from other tables"}
          </div>
          {otherTableViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewClick(view)}
              className="flex h-8 w-full items-center gap-2 rounded px-2.5 text-left text-[13px] text-gray-700 transition-colors hover:cursor-pointer hover:bg-gray-100"
            >
              <Grid className="h-4 w-4 shrink-0 text-blue-600" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate leading-tight">
                  <span className="font-semibold text-gray-800">
                    {view.name} in{" "}
                  </span>
                  {view.table.name}
                </span>
              </div>
            </button>
          ))}
        </>
      )}

      {/* No results */}
      {!isLoading &&
        currentTableViews.length === 0 &&
        otherTableViews.length === 0 && (
          <div className="px-2.5 py-2 text-xs text-gray-500">
            No views found
          </div>
        )}
    </div>
  );
}

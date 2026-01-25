"use client";

import { useState, useEffect, useRef } from "react";
import { TableBar } from "./TableBar";
import { ViewToolbar } from "./ViewToolbar";
import { BaseSideNav } from "./BaseSideNav";
import { DataGrid, SelectionProvider, useSelection } from "./DataGrid";
import { IconSidebar } from "../layout/IconSidebar";
import { BaseTopNav } from "./BaseTopNav";
import { ViewConfigProvider, useViewConfig } from "./hooks/useViewConfig";
import { api } from "~/trpc/react";

interface BaseContentProps {
  baseId: string;
  userInitial: string;
}

// Component that waits for view config to load before rendering toolbar and grid
// BaseSideNav should stay outside to remain visible during view switches
function ViewConfigContent({
  onToggleSideNav,
  tableId,
  viewId,
  isSideNavOpen,
  dataGridRef,
  activeViewId,
  setActiveViewId,
}: {
  onToggleSideNav: () => void;
  tableId: string;
  viewId: string;
  isSideNavOpen: boolean;
  dataGridRef: React.RefObject<HTMLDivElement | null>;
  activeViewId: string | null;
  setActiveViewId: (id: string | null) => void;
}) {
  const { isConfigLoaded } = useViewConfig();

  // Show minimal loading UI while config loads
  if (!isConfigLoaded) {
    return (
      <>
        {/* Empty toolbar to maintain layout */}
        <div className="flex h-11 items-center border-b border-gray-200 bg-white" />
        {/* Content area with side nav */}
        <div className="flex flex-1 overflow-hidden">
          {isSideNavOpen && (
            <BaseSideNav
              tableId={tableId}
              selectedViewId={activeViewId}
              onViewSelect={setActiveViewId}
            />
          )}
          {/* Loading message */}
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Loading view configuration...
          </div>
        </div>
      </>
    );
  }

  // Config loaded - render toolbar and grid
  return (
    <>
      <ViewToolbar onToggleSideNav={onToggleSideNav} tableId={tableId} />

      {/* Content area with side nav and grid */}
      <div className="flex flex-1 overflow-hidden">
        {isSideNavOpen && (
          <BaseSideNav
            tableId={tableId}
            selectedViewId={activeViewId}
            onViewSelect={setActiveViewId}
          />
        )}

        {/* Main content area - grid only */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Data grid */}
          <main className="flex-1 overflow-auto bg-gray-50" ref={dataGridRef}>
            <DataGrid key={viewId} tableId={tableId} viewId={viewId} />
          </main>
        </div>
      </div>
    </>
  );
}

// Inner component that uses the selection context
function BaseContentInner({
  baseId,
  userInitial,
  activeTableId,
  activeViewId,
  setActiveTableId,
  setActiveViewId,
}: BaseContentProps & {
  activeTableId: string | null;
  activeViewId: string | null;
  setActiveTableId: (id: string | null) => void;
  setActiveViewId: (id: string | null) => void;
}) {
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const dataGridRef = useRef<HTMLDivElement>(null);
  const { clearSelection } = useSelection();

  // Get TRPC utils for cache invalidation
  const utils = api.useUtils();

  // Fetch tables for this base dynamically
  const { data: tables = [] } = api.table.getAllByBase.useQuery(
    { baseId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // -------------------------------------------------------------------------
  // RESTORE LAST VISITED TABLE/VIEW FROM LOCALSTORAGE
  // -------------------------------------------------------------------------
  // This runs once when the component mounts and tables are loaded
  useEffect(() => {
    if (tables.length === 0) return;
    if (activeTableId) return; // Already initialized

    // Try to restore from localStorage
    const storageKey = `airtable-base-${baseId}-last-visited`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const { tableId, viewId } = JSON.parse(stored) as {
          tableId: string;
          viewId: string;
        };

        // Verify table still exists
        const tableExists = tables.some((t) => t.id === tableId);
        if (tableExists) {
          setActiveTableId(tableId);
          setActiveViewId(viewId); // Will be validated when views load
          return;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Fallback: Select first table
    setActiveTableId(tables[0]!.id);
  }, [tables, activeTableId, baseId, setActiveTableId, setActiveViewId]);

  // Fetch views for the active table to auto-select the first one
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch
      gcTime: 0, // Don't cache
    },
  );

  // Auto-select first view when views load or table changes
  useEffect(() => {
    if (!views || views.length === 0) return;

    // If we have an activeViewId, validate it still exists
    if (activeViewId) {
      const viewExists = views.some((v) => v.id === activeViewId);
      if (!viewExists) {
        // View was deleted, select first view
        setActiveViewId(views[0]!.id);
      }
    } else {
      // No active view, select first one
      setActiveViewId(views[0]!.id);
    }
  }, [views, activeViewId, setActiveViewId]);

  // Reset view when table changes
  useEffect(() => {
    setActiveViewId(null);
  }, [activeTableId, setActiveViewId]);

  // -------------------------------------------------------------------------
  // SAVE LAST VISITED TABLE/VIEW TO LOCALSTORAGE
  // -------------------------------------------------------------------------
  // Save whenever user navigates to a different table or view
  useEffect(() => {
    if (!activeTableId || !activeViewId) return;

    const storageKey = `airtable-base-${baseId}-last-visited`;
    const data = {
      tableId: activeTableId,
      viewId: activeViewId,
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [baseId, activeTableId, activeViewId]);

  const createTableMutation = api.table.create.useMutation({
    onSuccess: (newTable) => {
      // Refetch tables to include the new one
      void utils.table.getAllByBase.invalidate({ baseId });
      // Select the newly created table
      setActiveTableId(newTable.id);
    },
  });

  const handleAddTable = (name: string) => {
    createTableMutation.mutate({
      baseId,
      name,
    });
  };

  const toggleSideNav = () => {
    setIsSideNavOpen((prev) => !prev);
  };

  // Clear selection when clicking outside the data grid
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dataGridRef.current &&
        !dataGridRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clearSelection]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Icon sidebar - far left */}
      <IconSidebar userInitial={userInitial} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Base Top Nav - Data/Automations/Interfaces/Forms tabs */}
        <BaseTopNav baseName="Untitled Base" />

        {/* Table bar */}
        <TableBar
          tables={tables}
          activeTableId={activeTableId}
          onTableSelect={setActiveTableId}
          onAddTable={handleAddTable}
        />

        {/* ViewConfigProvider wraps toolbar + sidebar + grid */}
        {activeTableId && activeViewId ? (
          <ViewConfigProvider viewId={activeViewId}>
            <ViewConfigContent
              onToggleSideNav={toggleSideNav}
              tableId={activeTableId}
              viewId={activeViewId}
              isSideNavOpen={isSideNavOpen}
              dataGridRef={dataGridRef}
              activeViewId={activeViewId}
              setActiveViewId={setActiveViewId}
            />
          </ViewConfigProvider>
        ) : (
          <>
            {/* Minimal UI while no table/view selected */}
            <div className="flex h-11 items-center border-b border-gray-200 bg-white" />
            <div className="flex flex-1 items-center justify-center text-gray-500">
              {activeTableId
                ? "Loading view..."
                : "No table selected. Create a table to get started."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function BaseContent({ baseId, userInitial }: BaseContentProps) {
  // Default to first table if available
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch views to get the total row/column count for SelectionProvider
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch
      gcTime: 0, // Don't cache
    },
  );

  return (
    <SelectionProvider totalRows={100} totalColumns={10}>
      <BaseContentInner
        baseId={baseId}
        userInitial={userInitial}
        activeTableId={activeTableId}
        activeViewId={activeViewId}
        setActiveTableId={setActiveTableId}
        setActiveViewId={setActiveViewId}
      />
    </SelectionProvider>
  );
}

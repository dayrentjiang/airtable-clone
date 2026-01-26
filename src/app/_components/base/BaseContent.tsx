"use client";

import { useState, useEffect, useRef } from "react";
import { TableBar } from "./TableBar";
import { ViewToolbar } from "./ViewToolbar";
import { BaseSideNav } from "./BaseSideNav";
import {
  DataGrid,
  SelectionProvider,
  ContextMenuProvider,
  useSelection,
} from "./DataGrid";
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
  onViewSelect,
}: {
  onToggleSideNav: () => void;
  tableId: string;
  viewId: string;
  isSideNavOpen: boolean;
  dataGridRef: React.RefObject<HTMLDivElement | null>;
  activeViewId: string | null;
  setActiveViewId: (id: string | null) => void;
  onViewSelect: (viewId: string) => void;
}) {
  const { isConfigLoaded } = useViewConfig();

  // Fetch table with columns - toolbar needs column names for filter/sort summaries
  // This ensures we don't render "Filter" then "Filter by Name" flash
  const { data: table, isLoading: tableLoading } = api.table.getById.useQuery(
    { id: tableId },
    {
      enabled: !!tableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Wait for BOTH view config AND table columns to load
  // This prevents toolbar from rendering with stale/incomplete data
  const isFullyLoaded = isConfigLoaded && !tableLoading && !!table?.columns;

  // Show minimal loading UI while config loads
  if (!isFullyLoaded) {
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
      <ViewToolbar
        onToggleSideNav={onToggleSideNav}
        tableId={tableId}
        viewId={viewId}
        onViewSelect={onViewSelect}
      />

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
  const [newlyCreatedTableId, setNewlyCreatedTableId] = useState<string | null>(
    null,
  );
  const [newlyCreatedTableName, setNewlyCreatedTableName] = useState<
    string | null
  >(null);
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
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.table.getAllByBase.cancel({ baseId });

      // Snapshot previous data
      const previousTables = utils.table.getAllByBase.getData({ baseId });

      // Generate a temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticTable = {
        id: tempId,
        name: variables.name,
        baseId: variables.baseId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically add the new table to the cache
      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return [optimisticTable];
        return [...old, optimisticTable];
      });

      // DO NOT select the table yet - wait for user to name it or cancel
      // Just track it for the modal
      setNewlyCreatedTableId(tempId);
      setNewlyCreatedTableName(variables.name);

      return { previousTables, tempId, previousActiveTableId: activeTableId };
    },
    onSuccess: (newTable, _variables, context) => {
      // Replace temp ID with real ID in cache
      if (context?.tempId) {
        utils.table.getAllByBase.setData({ baseId }, (old) => {
          if (!old) return [newTable];
          return old.map((table) =>
            table.id === context.tempId ? newTable : table,
          );
        });

        // Update tracked table ID to real ID
        setNewlyCreatedTableId(newTable.id);
      }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
      // Clear newly created table tracking on error
      setNewlyCreatedTableId(null);
      setNewlyCreatedTableName(null);
    },
    onSettled: () => {
      // Sync with server
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const renameTableMutation = api.table.update.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.table.getAllByBase.cancel({ baseId });

      // Snapshot previous data
      const previousTables = utils.table.getAllByBase.getData({ baseId });

      // Optimistically update the cache
      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return old;
        return old.map((table) =>
          table.id === variables.id
            ? { ...table, name: variables.name }
            : table,
        );
      });

      // If we're renaming the newly created table, update the tracked name
      if (variables.id === newlyCreatedTableId) {
        setNewlyCreatedTableName(variables.name);
      }

      return { previousTables };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      // Sync with server
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const deleteTableMutation = api.table.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.table.getAllByBase.cancel({ baseId });

      // Snapshot previous data
      const previousTables = utils.table.getAllByBase.getData({ baseId });

      // Optimistically update the cache - remove the deleted table
      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return old;
        return old.filter((table) => table.id !== variables.id);
      });

      // If the deleted table was active, select another table
      if (
        variables.id === activeTableId &&
        previousTables &&
        previousTables.length > 1
      ) {
        const remainingTables = previousTables.filter(
          (t) => t.id !== variables.id,
        );
        if (remainingTables.length > 0) {
          setActiveTableId(remainingTables[0]!.id);
        }
      }

      return { previousTables };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      // Sync with server
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const handleAddTable = (name: string) => {
    createTableMutation.mutate({
      baseId,
      name,
    });
  };

  const handleRenameTable = (tableId: string, newName: string) => {
    renameTableMutation.mutate({
      id: tableId,
      name: newName,
    });
  };

  const handleDeleteTable = (tableId: string) => {
    // Don't allow deleting the last table
    if (tables.length <= 1) {
      return;
    }
    deleteTableMutation.mutate({ id: tableId });
  };

  const handleClearNewTable = () => {
    // When modal is closed (either by save or cancel), select the newly created table
    if (newlyCreatedTableId) {
      setActiveTableId(newlyCreatedTableId);
    }
    // Clear the tracking state
    setNewlyCreatedTableId(null);
    setNewlyCreatedTableName(null);
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
          onRenameTable={handleRenameTable}
          onDeleteTable={handleDeleteTable}
          newTableId={newlyCreatedTableId}
          newTableName={newlyCreatedTableName}
          onClearNewTable={handleClearNewTable}
        />

        {/* ViewConfigProvider wraps toolbar + sidebar + grid */}
        {/* key={activeViewId} forces fresh mount on view switch - prevents stale state flash */}
        {activeTableId && activeViewId ? (
          <ViewConfigProvider key={activeViewId} viewId={activeViewId}>
            <ViewConfigContent
              onToggleSideNav={toggleSideNav}
              tableId={activeTableId}
              viewId={activeViewId}
              isSideNavOpen={isSideNavOpen}
              dataGridRef={dataGridRef}
              activeViewId={activeViewId}
              setActiveViewId={setActiveViewId}
              onViewSelect={setActiveViewId}
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
      <ContextMenuProvider>
        <BaseContentInner
          baseId={baseId}
          userInitial={userInitial}
          activeTableId={activeTableId}
          activeViewId={activeViewId}
          setActiveTableId={setActiveTableId}
          setActiveViewId={setActiveViewId}
        />
      </ContextMenuProvider>
    </SelectionProvider>
  );
}

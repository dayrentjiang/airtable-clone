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
import { ViewConfigProvider, useViewConfig } from "./_state/view-config";
import { BaseContextProvider, useBaseContext } from "./_state/base-context";
import { api } from "~/trpc/react";

interface BaseContentProps {
  baseId: string;
  userInitial: string;
  userName?: string;
  userEmail?: string;
  initialTableId?: string;
  initialViewId?: string;
}

// Component that waits for view config to load before rendering toolbar and grid
function ViewConfigContent({
  onToggleSideNav,
  tableId,
  viewId,
  isSideNavOpen,
  dataGridRef,
}: {
  onToggleSideNav: () => void;
  tableId: string;
  viewId: string;
  isSideNavOpen: boolean;
  dataGridRef: React.RefObject<HTMLDivElement | null>;
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
        <div className="flex h-12 items-center border-b border-gray-200 bg-white" />
        {/* Content area with side nav */}
        <div className="flex flex-1 overflow-hidden">
          {isSideNavOpen && <BaseSideNav />}
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
      <ViewToolbar onToggleSideNav={onToggleSideNav} />

      {/* Content area with side nav and grid */}
      <div className="flex flex-1 overflow-hidden">
        {isSideNavOpen && <BaseSideNav />}

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
  userName,
  userEmail,
}: Omit<BaseContentProps, "initialTableId" | "initialViewId">) {
  // Get context data and methods
  const {
    activeTableId,
    activeViewId,
    tables,
    selectTable,
    createTable,
    renameTable,
  } = useBaseContext();

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [newlyCreatedTableId, setNewlyCreatedTableId] = useState<string | null>(
    null,
  );
  const [newlyCreatedTableName, setNewlyCreatedTableName] = useState<
    string | null
  >(null);
  const dataGridRef = useRef<HTMLDivElement>(null);
  const { clearSelection } = useSelection();

  // Note: Table/view selection, localStorage sync, and view auto-selection
  // are now handled by BaseContext. No need to duplicate that logic here.

  // Handler for adding a new table - triggers the naming modal workflow
  const handleAddTable = (name: string) => {
    // Generate a temp ID shared with the context's optimistic update
    // so the table tab and the modal reference the same ID
    const tempId = `temp-${Date.now()}`;
    setNewlyCreatedTableId(tempId);
    setNewlyCreatedTableName(name);

    // Fire-and-forget: the optimistic update shows the tab immediately,
    // and we update to the real ID once the server responds
    createTable(name, tempId)
      .then((newTable) => {
        setNewlyCreatedTableId(newTable.id);
        setNewlyCreatedTableName(newTable.name);
      })
      .catch(() => {
        // Clear optimistic state on failure — context rolls back the table list
        setNewlyCreatedTableId(null);
        setNewlyCreatedTableName(null);
      });
  };

  // Handler for renaming a table
  const handleRenameTable = (tableId: string, newName: string) => {
    renameTable(tableId, newName);

    // If we're renaming the newly created table, update the tracked name
    if (tableId === newlyCreatedTableId) {
      setNewlyCreatedTableName(newName);
    }
  };

  // Handler for clearing the new table modal
  const handleClearNewTable = () => {
    // When modal is closed (either by save or cancel), select the newly created table
    if (newlyCreatedTableId) {
      selectTable(newlyCreatedTableId);
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
      <IconSidebar
        userInitial={userInitial}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Base Top Nav - Data/Automations/Interfaces/Forms tabs */}
        <BaseTopNav baseId={baseId} />

        {/* Table bar */}
        <TableBar
          newTableId={newlyCreatedTableId}
          newTableName={newlyCreatedTableName}
          onClearNewTable={handleClearNewTable}
          onAddTable={handleAddTable}
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
            />
          </ViewConfigProvider>
        ) : (
          <>
            {/* Minimal UI while no table/view selected */}
            <div className="flex h-12 items-center border-b border-gray-200 bg-white" />
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

export function BaseContent({
  baseId,
  userInitial,
  userName,
  userEmail,
  initialTableId,
  initialViewId,
}: BaseContentProps) {
  return (
    <BaseContextProvider
      baseId={baseId}
      initialTableId={initialTableId}
      initialViewId={initialViewId}
    >
      <SelectionProvider>
        <ContextMenuProvider>
          <BaseContentInner
            baseId={baseId}
            userInitial={userInitial}
            userName={userName}
            userEmail={userEmail}
          />
        </ContextMenuProvider>
      </SelectionProvider>
    </BaseContextProvider>
  );
}

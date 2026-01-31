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
import { BaseContextProvider, useBaseContext } from "./hooks/useBaseContext";
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
// BaseSideNav should stay outside to remain visible during view switches
function ViewConfigContent({
  onToggleSideNav,
  baseId,
  tableId,
  viewId,
  isSideNavOpen,
  dataGridRef,
}: {
  onToggleSideNav: () => void;
  baseId: string;
  tableId: string;
  viewId: string;
  isSideNavOpen: boolean;
  dataGridRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { isConfigLoaded } = useViewConfig();
  const { activeViewId, selectView, selectTableAndView } = useBaseContext();

  // Handler for selecting a view from a different table
  const handleTableAndViewSelect = (tableId: string, viewId: string) => {
    selectTableAndView(tableId, viewId);
  };

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
          {isSideNavOpen && (
            <BaseSideNav
              baseId={baseId}
              tableId={tableId}
              selectedViewId={activeViewId}
              onViewSelect={selectView}
              onTableAndViewSelect={handleTableAndViewSelect}
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
        onViewSelect={selectView}
      />

      {/* Content area with side nav and grid */}
      <div className="flex flex-1 overflow-hidden">
        {isSideNavOpen && (
          <BaseSideNav
            baseId={baseId}
            tableId={tableId}
            selectedViewId={activeViewId}
            onViewSelect={selectView}
            onTableAndViewSelect={handleTableAndViewSelect}
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
  userName,
  userEmail,
  activeTableId,
  activeViewId,
}: BaseContentProps & {
  activeTableId: string | null;
  activeViewId: string | null;
}) {
  // Get context data and methods
  const {
    base,
    tables,
    selectTable,
    selectView,
    selectTableAndView,
    createTable,
    renameTable,
    deleteTable,
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

  // Get TRPC utils for cache invalidation
  const utils = api.useUtils();

  // Note: Table/view selection, localStorage sync, and view auto-selection
  // are now handled by BaseContext. No need to duplicate that logic here.

  // Handler for adding a new table - triggers the naming modal workflow
  const handleAddTable = async (name: string) => {
    // Generate a temp ID and set it immediately to show the modal without delay
    const tempId = `temp-${Date.now()}`;
    setNewlyCreatedTableId(tempId);
    setNewlyCreatedTableName(name);
    
    // Create table via context (this will take time due to server round-trip)
    const newTable = await createTable(name);
    
    // Update with the real ID once the server responds
    setNewlyCreatedTableId(newTable.id);
    setNewlyCreatedTableName(newTable.name);
  };

  // Handler for renaming a table
  const handleRenameTable = (tableId: string, newName: string) => {
    renameTable(tableId, newName);
    
    // If we're renaming the newly created table, update the tracked name
    if (tableId === newlyCreatedTableId) {
      setNewlyCreatedTableName(newName);
    }
  };

  // Handler for deleting a table
  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId);
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
              baseId={baseId}
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
    // BaseContextProvider: Single source of truth for base/table/view state
    <BaseContextProvider
      baseId={baseId}
      initialTableId={initialTableId}
      initialViewId={initialViewId}
    >
      <BaseContentWithContext
        baseId={baseId}
        userInitial={userInitial}
        userName={userName}
        userEmail={userEmail}
      />
    </BaseContextProvider>
  );
}

// Inner component that reads from context
function BaseContentWithContext({
  baseId,
  userInitial,
  userName,
  userEmail,
}: Omit<BaseContentProps, "initialTableId" | "initialViewId">) {
  // Read active table/view from context instead of local state
  const { activeTableId, activeViewId } = useBaseContext();

  // Fetch table to get the column count
  const { data: table } = api.table.getById.useQuery(
    { id: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Fetch row count for the active view
  const { data: rowData } = api.row.infiniteWithView.useQuery(
    {
      tableId: activeTableId!,
      viewId: activeViewId!,
      filters: [],
      sorts: [],
      offset: 0,
      limit: 1,
    },
    {
      enabled: !!activeTableId && !!activeViewId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Calculate totalRows and totalColumns
  // Add 1 to columns for the row number column
  const totalColumns = table?.columns ? table.columns.length + 1 : 10;
  const totalRows = rowData?.totalCount ?? 100;

  return (
    <SelectionProvider totalRows={totalRows} totalColumns={totalColumns}>
      <ContextMenuProvider>
        <BaseContentInner
          baseId={baseId}
          userInitial={userInitial}
          userName={userName}
          userEmail={userEmail}
          activeTableId={activeTableId}
          activeViewId={activeViewId}
        />
      </ContextMenuProvider>
    </SelectionProvider>
  );
}

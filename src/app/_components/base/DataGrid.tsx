"use client";

import { useEffect, useRef } from "react";
import { DataGridTable } from "./DataGrid/components/DataGridTable";
import { AddColumnButton } from "./DataGrid/components/AddColumnButton";
import { CellContextMenu } from "./DataGrid/context-menus/CellContextMenu";
import { ColumnHeaderContextMenu } from "./DataGrid/context-menus/ColumnHeaderContextMenu";
import { useContextMenu } from "./DataGrid/hooks/useContextMenu";
import { useSelection } from "./DataGrid/hooks/useSelection";
import { useViewConfig } from "./_state/view-config";
import {
  DataGridContextProvider,
  useDataGridContext,
} from "./DataGrid/_state";

// Re-export providers and hooks for use in parent components
export { SelectionProvider, useSelection } from "./DataGrid/hooks/useSelection";
export { ContextMenuProvider } from "./DataGrid/hooks/useContextMenu";

interface DataGridProps {
  tableId: string;
  viewId: string;
}

/**
 * DATAGRID - Main Component
 *
 * This is the entry point. It wraps everything with DataGridContextProvider
 * and delegates to DataGridInner which consumes the context.
 *
 * Pattern:
 * DataGrid (wrapper) -> Provider -> DataGridInner (consumer)
 */
export function DataGrid({ tableId, viewId }: DataGridProps) {
  return (
    <DataGridContextProvider tableId={tableId} viewId={viewId}>
      <DataGridInner />
    </DataGridContextProvider>
  );
}

/**
 * DATAGRID INNER
 *
 * The actual implementation that consumes context.
 * This component is simple because all logic lives in DataGridContext.
 */
function DataGridInner() {
  // -------------------------------------------------------------------------
  // CONTEXT
  // -------------------------------------------------------------------------

  // Get all grid state from context
  const {
    table,
    tableContainerRef,
    isLoadingTable,
    isLoadingRows,
    totalCount,
    tableWidth,
    viewId,
    clearRowValues,
    columns,
  } = useDataGridContext();

  // Get view config state
  const { isConfigLoaded } = useViewConfig();

  // Get context menu state
  const {
    contextMenuState,
    columnContextMenuState,
    hideContextMenu,
    hideColumnContextMenu,
  } = useContextMenu();

  // Get selection state for keyboard shortcuts
  const { selectedRowIds, editingCell, clearSelection, updateDimensions } =
    useSelection();

  // -------------------------------------------------------------------------
  // KEYBOARD HANDLER: Delete/Backspace to clear selected rows
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedRowIds.size === 0 || editingCell) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const rowIds = Array.from(selectedRowIds);
        void clearRowValues(rowIds);
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowIds, editingCell, clearSelection, clearRowValues]);

  // -------------------------------------------------------------------------
  // RESTORE SCROLL POSITION FROM LOCALSTORAGE
  // -------------------------------------------------------------------------

  const hasRestoredScrollRef = useRef(false);

  useEffect(() => {
    if (totalCount === 0 || hasRestoredScrollRef.current) return;

    const storageKey = `airtable-scroll-${viewId}`;
    const savedScrollTop = localStorage.getItem(storageKey);

    if (savedScrollTop && tableContainerRef.current) {
      const scrollTop = parseInt(savedScrollTop, 10);

      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = scrollTop;
          hasRestoredScrollRef.current = true;
        }
      }, 0);
    } else {
      hasRestoredScrollRef.current = true;
    }
  }, [viewId, totalCount, tableContainerRef]);

  // -------------------------------------------------------------------------
  // SAVE SCROLL POSITION TO LOCALSTORAGE
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const storageKey = `airtable-scroll-${viewId}`;
        localStorage.setItem(storageKey, container.scrollTop.toString());
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [viewId, tableContainerRef]);

  // Reset restoration flag when view changes
  useEffect(() => {
    hasRestoredScrollRef.current = false;
  }, [viewId]);

  // -------------------------------------------------------------------------
  // PUSH DIMENSIONS TO SELECTION PROVIDER
  // -------------------------------------------------------------------------

  useEffect(() => {
    updateDimensions(totalCount, columns.length);
  }, [totalCount, columns.length, updateDimensions]);

  // -------------------------------------------------------------------------
  // LOADING STATES
  // -------------------------------------------------------------------------

  if (!isConfigLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading view configuration...</div>
      </div>
    );
  }

  if (isLoadingTable || isLoadingRows) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Table not found</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="relative h-full">
      <div
        ref={tableContainerRef}
        className="h-full overflow-auto"
        style={{ contain: "strict" }}
      >
        <div className="pb-30 flex">
          <DataGridTable />
          <AddColumnButton />
        </div>

        {/* Empty state overlay */}
        {totalCount === 0 && !isLoadingRows && !isLoadingTable && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
            <div className="text-center">
              <p className="text-sm text-gray-500">All records are filtered</p>
            </div>
          </div>
        )}

        {/* Global context menu for rows */}
        {contextMenuState?.cellRef && (
          <CellContextMenu
            cellRef={contextMenuState.cellRef}
            rowId={contextMenuState.rowId}
            tableId={contextMenuState.tableId}
            selectedRowIds={contextMenuState.selectedRowIds}
            onClose={hideContextMenu}
          />
        )}

        {/* Global context menu for columns */}
        {columnContextMenuState?.headerRef && (
          <ColumnHeaderContextMenu
            headerRef={columnContextMenuState.headerRef}
            columnId={columnContextMenuState.columnId}
            tableId={columnContextMenuState.tableId}
            onClose={hideColumnContextMenu}
            initiallyOpenEditPanel={columnContextMenuState.openEditPanel}
          />
        )}
      </div>

      {/* Sticky bottom bar showing record count */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 px-4 py-1">
        <div className="text-xs text-gray-600" style={{ width: tableWidth }}>
          {totalCount} {totalCount === 1 ? "record" : "records"}
        </div>
      </div>
    </div>
  );
}

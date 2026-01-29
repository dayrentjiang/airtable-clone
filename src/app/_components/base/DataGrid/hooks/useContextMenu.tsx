"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ContextMenuState {
  cellRef: HTMLElement | null;
  rowId: string;
  tableId: string;
  selectedRowIds: string[]; // All selected row IDs for bulk operations
}

interface ColumnContextMenuState {
  headerRef: HTMLElement | null;
  columnId: string;
  tableId: string;
  openEditPanel?: boolean;
}

interface ContextMenuContextValue {
  contextMenuState: ContextMenuState | null;
  columnContextMenuState: ColumnContextMenuState | null;
  showContextMenu: (
    cellRef: HTMLElement,
    rowId: string,
    tableId: string,
    selectedRowIds: string[],
  ) => void;
  showColumnContextMenu: (
    headerRef: HTMLElement,
    columnId: string,
    tableId: string,
    openEditPanel?: boolean,
  ) => void;
  hideContextMenu: () => void;
  hideColumnContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

interface ContextMenuProviderProps {
  children: ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  const [contextMenuState, setContextMenuState] =
    useState<ContextMenuState | null>(null);
  const [columnContextMenuState, setColumnContextMenuState] =
    useState<ColumnContextMenuState | null>(null);

  const showContextMenu = useCallback(
    (
      cellRef: HTMLElement,
      rowId: string,
      tableId: string,
      selectedRowIds: string[],
    ) => {
      setContextMenuState({ cellRef, rowId, tableId, selectedRowIds });
      // Close column context menu if open
      setColumnContextMenuState(null);
    },
    [],
  );

  const showColumnContextMenu = useCallback(
    (headerRef: HTMLElement, columnId: string, tableId: string, openEditPanel = false) => {
      setColumnContextMenuState({ headerRef, columnId, tableId, openEditPanel });
      // Close row context menu if open
      setContextMenuState(null);
    },
    [],
  );

  const hideContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const hideColumnContextMenu = useCallback(() => {
    setColumnContextMenuState(null);
  }, []);

  return (
    <ContextMenuContext.Provider
      value={{
        contextMenuState,
        columnContextMenuState,
        showContextMenu,
        showColumnContextMenu,
        hideContextMenu,
        hideColumnContextMenu,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider");
  }
  return context;
}

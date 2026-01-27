"use client";

import { createContext, useContext } from "react";
import type { RowData } from "./useTableColumns";

interface WindowedRowsContextValue {
  addOptimisticRow: (row: RowData) => number;
  invalidate: () => void;
  totalCount: number;
}

const WindowedRowsContext = createContext<WindowedRowsContextValue | null>(null);

export function WindowedRowsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: WindowedRowsContextValue;
}) {
  return (
    <WindowedRowsContext.Provider value={value}>
      {children}
    </WindowedRowsContext.Provider>
  );
}

export function useWindowedRowsContext() {
  const context = useContext(WindowedRowsContext);
  if (!context) {
    throw new Error("useWindowedRowsContext must be used within a WindowedRowsProvider");
  }
  return context;
}

import { useContext } from "react";
import { DataGridContext } from "./DataGridContext";

/**
 * HOOK: useDataGridContext
 *
 * Custom hook to consume DataGrid context.
 * Throws error if used outside of DataGridContextProvider.
 *
 * Usage:
 * const { tableId, rowsByIndex, addOptimisticRow } = useDataGridContext();
 */
export function useDataGridContext() {
  const context = useContext(DataGridContext);
  
  if (!context) {
    throw new Error(
      "useDataGridContext must be used within DataGridContextProvider"
    );
  }
  
  return context;
}

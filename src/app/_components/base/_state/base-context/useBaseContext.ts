import { useContext } from "react";
import { BaseContext } from "./BaseContext";
import type { BaseContextValue } from "./types";

/**
 * Hook to access BaseContext
 *
 * @throws Error if used outside of BaseContextProvider
 *
 * @example
 * function MyComponent() {
 *   const { activeTableId, selectTable } = useBaseContext();
 *   return <div onClick={() => selectTable('table-1')}>Select</div>;
 * }
 */
export function useBaseContext(): BaseContextValue {
  const context = useContext(BaseContext);

  if (!context) {
    throw new Error(
      "useBaseContext must be used within a BaseContextProvider. " +
        "Make sure your component is wrapped with <BaseContextProvider>.",
    );
  }

  return context;
}

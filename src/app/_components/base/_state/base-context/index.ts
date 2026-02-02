/**
 * BASE CONTEXT
 *
 * Public API for the base-level context.
 * Import from this file to access Provider and Hook.
 */

// Provider component
export { BaseContextProvider } from "./BaseContext";

// Hook for accessing context
export { useBaseContext } from "./useBaseContext";

// Type exports
export type { BaseContextValue, BaseContextProviderProps } from "./types";

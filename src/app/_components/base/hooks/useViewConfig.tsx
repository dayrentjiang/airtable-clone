"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";
import type { Filter, Sort, ViewConfig } from "~/server/lib/types";

/**
 * VIEW CONFIG STATE MANAGEMENT
 *
 * This hook manages the "live" state of view configuration.
 *
 * KEY CONCEPTS:
 * 1. SAVED CONFIG - What's stored in the database (view.config)
 * 2. LIVE CONFIG - What user is currently editing (local state)
 * 3. DIRTY STATE - When live !== saved, we have unsaved changes
 *
 * WHY SEPARATE LIVE VS SAVED?
 * - Users can preview filter/sort changes before saving
 * - If they navigate away, unsaved changes are discarded
 * - This matches Airtable's behavior
 *
 * HOW IT WORKS:
 * 1. When viewId changes, we fetch saved config from DB
 * 2. Local state is initialized from saved config
 * 3. User edits modify local state only
 * 4. "Save" button persists local state to DB
 * 5. DataGrid queries use local state (for live preview)
 */

// ============================================================================
// TYPES
// ============================================================================

interface ViewConfigContextValue {
  // Current view info
  viewId: string | null;

  // Live configuration (what user is editing)
  search: string;
  filters: Filter[];
  sorts: Sort[];
  hiddenFields: string[];

  // Setters for live config
  setSearch: (search: string) => void;
  setFilters: (filters: Filter[]) => void;
  addFilter: (filter: Filter) => void;
  updateFilter: (index: number, filter: Filter) => void;
  removeFilter: (index: number) => void;
  setSorts: (sorts: Sort[]) => void;
  addSort: (sort: Sort) => void;
  updateSort: (index: number, sort: Sort) => void;
  removeSort: (index: number) => void;
  setHiddenFields: (hiddenFields: string[]) => void;
  toggleFieldVisibility: (columnId: string) => void;

  // Search match tracking (for navigation "1 of 4")
  searchMatchCount: number;
  currentMatchIndex: number;
  setSearchMatchCount: (count: number) => void;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;

  // State tracking
  isDirty: boolean;        // Has unsaved changes?
  isSaving: boolean;       // Currently saving?

  // Actions
  saveConfig: () => Promise<void>;  // Persist to DB
  resetConfig: () => void;          // Discard changes, reload from saved
}

// ============================================================================
// CONTEXT
// ============================================================================

const ViewConfigContext = createContext<ViewConfigContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ViewConfigProviderProps {
  viewId: string | null;
  children: ReactNode;
}

export function ViewConfigProvider({ viewId, children }: ViewConfigProviderProps) {
  // ---------------------------------------------------------------------------
  // FETCH SAVED CONFIG FROM DATABASE
  // ---------------------------------------------------------------------------

  const { data: view, isLoading } = api.view.getById.useQuery(
    { id: viewId! },
    {
      enabled: !!viewId,
      staleTime: 0,      // Always refetch when switching views
      gcTime: 0,         // Don't cache
      refetchOnMount: true,
    }
  );

  // Parse saved config (or use defaults)
  const savedConfig = useMemo((): ViewConfig => {
    if (!view?.config) {
      return { filters: [], sorts: [], hiddenFields: [], fieldOrder: [] };
    }
    return view.config as ViewConfig;
  }, [view?.config]);

  // ---------------------------------------------------------------------------
  // LOCAL STATE (Live Config)
  // ---------------------------------------------------------------------------

  // These are the "live" values that user is editing
  // They start from saved config and can diverge until saved
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);

  // Search match tracking for navigation ("1 of 4")
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Wrapper for setSearch that resets match index
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setCurrentMatchIndex(0); // Reset to first match when search changes
  }, []);

  // ---------------------------------------------------------------------------
  // SYNC: When saved config changes, update local state
  // ---------------------------------------------------------------------------

  // This runs when:
  // 1. View first loads
  // 2. User switches to a different view
  // 3. After saving (to confirm sync)
  useEffect(() => {
    // Reset search when switching views (search is not saved to view config)
    setSearch("");

    // Initialize local state from saved config
    setFilters(savedConfig.filters);
    setSorts(savedConfig.sorts);
    setHiddenFields(savedConfig.hiddenFields);
  }, [savedConfig, viewId]); // viewId in deps ensures reset on view switch

  // ---------------------------------------------------------------------------
  // DIRTY CHECK: Has local state diverged from saved?
  // ---------------------------------------------------------------------------

  const isDirty = useMemo(() => {
    // Compare filters
    if (JSON.stringify(filters) !== JSON.stringify(savedConfig.filters)) {
      return true;
    }
    // Compare sorts
    if (JSON.stringify(sorts) !== JSON.stringify(savedConfig.sorts)) {
      return true;
    }
    // Compare hidden fields
    if (JSON.stringify(hiddenFields) !== JSON.stringify(savedConfig.hiddenFields)) {
      return true;
    }
    return false;
  }, [filters, sorts, hiddenFields, savedConfig]);

  // ---------------------------------------------------------------------------
  // FILTER OPERATIONS
  // ---------------------------------------------------------------------------

  const addFilter = useCallback((filter: Filter) => {
    setFilters(prev => [...prev, filter]);
  }, []);

  const updateFilter = useCallback((index: number, filter: Filter) => {
    setFilters(prev => prev.map((f, i) => i === index ? filter : f));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ---------------------------------------------------------------------------
  // SORT OPERATIONS
  // ---------------------------------------------------------------------------

  const addSort = useCallback((sort: Sort) => {
    setSorts(prev => [...prev, sort]);
  }, []);

  const updateSort = useCallback((index: number, sort: Sort) => {
    setSorts(prev => prev.map((s, i) => i === index ? sort : s));
  }, []);

  const removeSort = useCallback((index: number) => {
    setSorts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ---------------------------------------------------------------------------
  // FIELD VISIBILITY OPERATIONS
  // ---------------------------------------------------------------------------

  const toggleFieldVisibility = useCallback((columnId: string) => {
    setHiddenFields(prev => {
      if (prev.includes(columnId)) {
        // Currently hidden → show it (remove from hidden list)
        return prev.filter(id => id !== columnId);
      } else {
        // Currently visible → hide it (add to hidden list)
        return [...prev, columnId];
      }
    });
  }, []);

  // ---------------------------------------------------------------------------
  // SEARCH NAVIGATION
  // ---------------------------------------------------------------------------

  const goToNextMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const goToPrevMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setCurrentMatchIndex(prev => prev === 0 ? searchMatchCount - 1 : prev - 1);
  }, [searchMatchCount]);

  // ---------------------------------------------------------------------------
  // SAVE TO DATABASE
  // ---------------------------------------------------------------------------

  const utils = api.useUtils();

  const updateConfigMutation = api.view.updateConfig.useMutation({
    onSuccess: () => {
      // Invalidate view query to refetch saved config
      void utils.view.getById.invalidate({ id: viewId! });
      // Also invalidate rows since filters/sorts may have changed
      void utils.row.invalidate();
    },
  });

  const saveConfig = useCallback(async () => {
    if (!viewId) return;

    await updateConfigMutation.mutateAsync({
      id: viewId,
      config: {
        filters,
        sorts,
        hiddenFields,
        fieldOrder: savedConfig.fieldOrder, // Preserve field order
      },
    });
  }, [viewId, filters, sorts, hiddenFields, savedConfig.fieldOrder, updateConfigMutation]);

  // ---------------------------------------------------------------------------
  // RESET (Discard Changes)
  // ---------------------------------------------------------------------------

  const resetConfig = useCallback(() => {
    setSearch("");
    setFilters(savedConfig.filters);
    setSorts(savedConfig.sorts);
    setHiddenFields(savedConfig.hiddenFields);
  }, [savedConfig]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = useMemo((): ViewConfigContextValue => ({
    viewId,
    search,
    filters,
    sorts,
    hiddenFields,
    setSearch,
    setFilters,
    addFilter,
    updateFilter,
    removeFilter,
    setSorts,
    addSort,
    updateSort,
    removeSort,
    setHiddenFields,
    toggleFieldVisibility,
    searchMatchCount,
    currentMatchIndex,
    setSearchMatchCount,
    goToNextMatch,
    goToPrevMatch,
    isDirty,
    isSaving: updateConfigMutation.isPending,
    saveConfig,
    resetConfig,
  }), [
    viewId,
    search,
    filters,
    sorts,
    hiddenFields,
    setSearch,
    addFilter,
    updateFilter,
    removeFilter,
    addSort,
    updateSort,
    removeSort,
    toggleFieldVisibility,
    searchMatchCount,
    currentMatchIndex,
    goToNextMatch,
    goToPrevMatch,
    isDirty,
    updateConfigMutation.isPending,
    saveConfig,
    resetConfig,
  ]);

  return (
    <ViewConfigContext.Provider value={value}>
      {children}
    </ViewConfigContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useViewConfig(): ViewConfigContextValue {
  const context = useContext(ViewConfigContext);

  if (!context) {
    throw new Error("useViewConfig must be used within a ViewConfigProvider");
  }

  return context;
}

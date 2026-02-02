import type { Filter, Sort } from "~/server/lib/types";

/**
 * VIEW CONFIG STATE MANAGEMENT TYPES
 *
 * This defines the types for view configuration state.
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

export interface ViewConfigContextValue {
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
  isConfigLoaded: boolean; // Has config loaded from DB?
  isDirty: boolean; // Has unsaved changes?
  isSaving: boolean; // Currently saving?

  // Actions
  // saveConfig accepts optional overrides to bypass closure issues
  // When called from a popover after setFilters(), pass the new filters directly
  saveConfig: (overrides?: {
    filters?: Filter[];
    sorts?: Sort[];
    hiddenFields?: string[];
  }) => Promise<void>;
  resetConfig: () => void; // Discard changes, reload from saved
}

export interface ViewConfigProviderProps {
  viewId: string | null;
  children: React.ReactNode;
}

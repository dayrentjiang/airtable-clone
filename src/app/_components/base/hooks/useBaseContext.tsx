"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";

/**
 * BASE CONTEXT
 * 
 * Single source of truth for base-level state:
 * - Current table/view selection
 * - Tables and views data (fetched once, shared by all components)
 * - Table/view operations (create, rename, delete)
 * 
 * WHY THIS EXISTS:
 * - Eliminates duplicate queries (views were fetched 3x in different components)
 * - Removes prop drilling (11 props through ViewConfigContent)
 * - Simplifies state management (single location instead of scattered)
 */

// ============================================================================
// TYPES
// ============================================================================

interface BaseContextValue {
  // Current selections
  baseId: string;
  activeTableId: string | null;
  activeViewId: string | null;

  // Data (cached, fetched once)
  base: { id: string; name: string } | null;
  tables: Array<{
    id: string;
    name: string;
    baseId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  views: Array<{
    id: string;
    name: string;
    type: string;
    tableId: string;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // Computed/derived data
  activeTable: {
    id: string;
    name: string;
    baseId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  activeView: {
    id: string;
    name: string;
    type: string;
    tableId: string;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null;

  // Loading states
  isLoadingBase: boolean;
  isLoadingTables: boolean;
  isLoadingViews: boolean;

  // Selection actions
  selectTable: (tableId: string) => void;
  selectView: (viewId: string) => void;
  selectTableAndView: (tableId: string, viewId: string) => void;

  // Table operations
  createTable: (name: string) => Promise<{ id: string; name: string }>;
  renameTable: (tableId: string, name: string) => void;
  deleteTable: (tableId: string) => void;

  // View operations
  createView: (
    tableId: string,
    name: string,
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => Promise<{ id: string; name: string }>;
  renameView: (viewId: string, name: string) => void;
  deleteView: (viewId: string) => void;
}

const BaseContext = createContext<BaseContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface BaseContextProviderProps {
  children: ReactNode;
  baseId: string;
  initialTableId?: string | null;
  initialViewId?: string | null;
}

export function BaseContextProvider({
  children,
  baseId,
  initialTableId = null,
  initialViewId = null,
}: BaseContextProviderProps) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [activeTableId, setActiveTableId] = useState<string | null>(
    initialTableId,
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(
    initialViewId,
  );

  // Sync with parent's table/view changes
  // This ensures the context stays in sync when parent components change selection
  useEffect(() => {
    if (initialTableId && initialTableId !== activeTableId) {
      setActiveTableId(initialTableId);
    }
  }, [initialTableId, activeTableId]);

  useEffect(() => {
    if (initialViewId && initialViewId !== activeViewId) {
      setActiveViewId(initialViewId);
    }
  }, [initialViewId, activeViewId]);

  // -------------------------------------------------------------------------
  // QUERIES - Fetch data once, share with all components
  // -------------------------------------------------------------------------

  // Fetch base
  const { data: base, isLoading: isLoadingBase } = api.base.getById.useQuery(
    { id: baseId },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  // Fetch tables for this base
  const { data: tables = [], isLoading: isLoadingTables } =
    api.table.getAllByBase.useQuery(
      { baseId },
      {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
      },
    );

  // Fetch views for active table
  // This replaces the 3 duplicate queries in BaseContent, ViewToolbar, and BaseSideNav
  const { data: views = [], isLoading: isLoadingViews } =
    api.view.getByTableId.useQuery(
      { tableId: activeTableId! },
      {
        enabled: !!activeTableId,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        staleTime: 0,
        gcTime: 0,
      },
    );

  // -------------------------------------------------------------------------
  // LOCALSTORAGE SYNC
  // -------------------------------------------------------------------------

  // Restore last visited table/view from localStorage
  useEffect(() => {
    if (tables.length === 0) return;
    if (activeTableId) return; // Already initialized

    const storageKey = `airtable-base-${baseId}-last-visited`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const { tableId, viewId } = JSON.parse(stored) as {
          tableId: string;
          viewId: string;
        };

        // Verify table still exists
        const tableExists = tables.some((t) => t.id === tableId);
        if (tableExists) {
          setActiveTableId(tableId);
          setActiveViewId(viewId); // Will be validated when views load
          return;
        }
      } catch (e) {
        console.error("Failed to parse stored table/view:", e);
      }
    }

    // Fallback: Select first table
    setActiveTableId(tables[0]!.id);
  }, [tables, activeTableId, baseId]);

  // Save to localStorage when changed
  useEffect(() => {
    if (!activeTableId || !activeViewId) return;

    const storageKey = `airtable-base-${baseId}-last-visited`;
    const data = { tableId: activeTableId, viewId: activeViewId };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [baseId, activeTableId, activeViewId]);

  // -------------------------------------------------------------------------
  // AUTO-SELECT FIRST VIEW
  // -------------------------------------------------------------------------

  // When views load or table changes, auto-select first view
  useEffect(() => {
    if (!views || views.length === 0) return;

    // If we have an activeViewId, validate it still exists
    if (activeViewId) {
      const viewExists = views.some((v) => v.id === activeViewId);
      if (!viewExists) {
        // View was deleted, select first view
        setActiveViewId(views[0]!.id);
      }
    } else {
      // No active view, select first one
      setActiveViewId(views[0]!.id);
    }
  }, [views, activeViewId]);

  // -------------------------------------------------------------------------
  // SELECTION ACTIONS
  // -------------------------------------------------------------------------

  const selectTable = useCallback((tableId: string) => {
    setActiveTableId(tableId);
    // Reset view - will auto-select first view when views load
    setActiveViewId(null);
  }, []);

  const selectView = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  const selectTableAndView = useCallback(
    (tableId: string, viewId: string) => {
      setActiveTableId(tableId);
      setActiveViewId(viewId);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // TABLE OPERATIONS
  // -------------------------------------------------------------------------

  const utils = api.useUtils();

  // Track temp ID to real ID mapping for optimistic updates
  const tempIdMapRef = useRef<Map<string, string>>(new Map());

  const createTableMutation = api.table.create.useMutation({
    onMutate: async (variables) => {
      await utils.table.getAllByBase.cancel({ baseId });

      const previousTables = utils.table.getAllByBase.getData({ baseId });

      const tempId = `temp-${Date.now()}`;
      const optimisticTable = {
        id: tempId,
        name: variables.name,
        baseId: variables.baseId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return [optimisticTable];
        return [...old, optimisticTable];
      });

      return { previousTables, tempId };
    },
    onSuccess: (newTable, _variables, context) => {
      if (context?.tempId) {
        // Store mapping from temp ID to real ID
        tempIdMapRef.current.set(context.tempId, newTable.id);
        
        utils.table.getAllByBase.setData({ baseId }, (old) => {
          if (!old) return [newTable];
          return old.map((table) =>
            table.id === context.tempId ? newTable : table,
          );
        });
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const renameTableMutation = api.table.update.useMutation({
    onMutate: async (variables) => {
      await utils.table.getAllByBase.cancel({ baseId });

      const previousTables = utils.table.getAllByBase.getData({ baseId });

      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return old;
        return old.map((table) =>
          table.id === variables.id
            ? { ...table, name: variables.name }
            : table,
        );
      });

      return { previousTables };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const deleteTableMutation = api.table.delete.useMutation({
    onMutate: async (variables) => {
      await utils.table.getAllByBase.cancel({ baseId });

      const previousTables = utils.table.getAllByBase.getData({ baseId });

      utils.table.getAllByBase.setData({ baseId }, (old) => {
        if (!old) return old;
        return old.filter((table) => table.id !== variables.id);
      });

      // If deleting active table, select another
      if (variables.id === activeTableId && previousTables && previousTables.length > 1) {
        const remainingTables = previousTables.filter((t) => t.id !== variables.id);
        if (remainingTables.length > 0) {
          setActiveTableId(remainingTables[0]!.id);
        }
      }

      return { previousTables };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTables) {
        utils.table.getAllByBase.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      void utils.table.getAllByBase.invalidate({ baseId });
    },
  });

  const createTable = useCallback(
    async (name: string) => {
      return await createTableMutation.mutateAsync({ baseId, name });
    },
    [baseId, createTableMutation],
  );

  const renameTable = useCallback(
    (tableId: string, name: string) => {
      renameTableMutation.mutate({ id: tableId, name });
    },
    [renameTableMutation],
  );

  const deleteTable = useCallback(
    (tableId: string) => {
      if (tables.length <= 1) return; // Don't delete last table
      deleteTableMutation.mutate({ id: tableId });
    },
    [tables.length, deleteTableMutation],
  );

  // -------------------------------------------------------------------------
  // VIEW OPERATIONS
  // -------------------------------------------------------------------------

  const createViewMutation = api.view.create.useMutation({
    onSuccess: (newView) => {
      void utils.view.getByTableId.invalidate({ tableId: activeTableId! });
      setActiveViewId(newView.id);
    },
  });

  const renameViewMutation = api.view.rename.useMutation({
    onMutate: async (variables) => {
      await utils.view.getByTableId.cancel({ tableId: activeTableId! });
      await utils.view.getById.cancel({ id: variables.id });

      const previousViews = utils.view.getByTableId.getData({
        tableId: activeTableId!,
      });
      const previousView = utils.view.getById.getData({ id: variables.id });

      // Update views list
      if (previousViews) {
        utils.view.getByTableId.setData({ tableId: activeTableId! }, (old) =>
          old?.map((view) =>
            view.id === variables.id ? { ...view, name: variables.name } : view,
          ),
        );
      }

      // Update single view (for ViewToolbar)
      if (previousView) {
        utils.view.getById.setData({ id: variables.id }, (old) =>
          old ? { ...old, name: variables.name } : old,
        );
      }

      return { previousViews, previousView };
    },
    onError: (_err, variables, context) => {
      if (context?.previousViews) {
        utils.view.getByTableId.setData(
          { tableId: activeTableId! },
          context.previousViews,
        );
      }
      if (context?.previousView) {
        utils.view.getById.setData({ id: variables.id }, context.previousView);
      }
    },
    onSettled: (_data, _error, variables) => {
      void utils.view.getByTableId.invalidate({ tableId: activeTableId! });
      void utils.view.getById.invalidate({ id: variables.id });
    },
  });

  const deleteViewMutation = api.view.delete.useMutation({
    onMutate: async (variables) => {
      await utils.view.getByTableId.cancel({ tableId: activeTableId! });

      const previousViews = utils.view.getByTableId.getData({
        tableId: activeTableId!,
      });

      utils.view.getByTableId.setData({ tableId: activeTableId! }, (old) => {
        if (!old) return old;
        return old.filter((view) => view.id !== variables.id);
      });

      // If deleting active view, select another
      if (variables.id === activeViewId && previousViews && previousViews.length > 1) {
        const remainingViews = previousViews.filter((v) => v.id !== variables.id);
        if (remainingViews.length > 0) {
          setActiveViewId(remainingViews[0]!.id);
        }
      }

      return { previousViews };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousViews) {
        utils.view.getByTableId.setData(
          { tableId: activeTableId! },
          context.previousViews,
        );
      }
    },
    onSettled: () => {
      void utils.view.getByTableId.invalidate({ tableId: activeTableId! });
    },
  });

  const createView = useCallback(
    async (
      tableId: string,
      name: string,
      type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
    ) => {
      return await createViewMutation.mutateAsync({ tableId, name, type });
    },
    [createViewMutation],
  );

  const renameView = useCallback(
    (viewId: string, name: string) => {
      renameViewMutation.mutate({ id: viewId, name });
    },
    [renameViewMutation],
  );

  const deleteView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return; // Don't delete last view
      deleteViewMutation.mutate({ id: viewId });
    },
    [views.length, deleteViewMutation],
  );

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  // -------------------------------------------------------------------------

  // Compute derived values
  const activeTable = useMemo(
    () => tables.find((t) => t.id === activeTableId) ?? null,
    [tables, activeTableId],
  );

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? null,
    [views, activeViewId],
  );

  const value = useMemo(
    () => ({
      baseId,
      activeTableId,
      activeViewId,
      base: base ?? null,
      tables,
      views,
      activeTable,
      activeView,
      isLoadingBase,
      isLoadingTables,
      isLoadingViews,
      selectTable,
      selectView,
      selectTableAndView,
      createTable,
      renameTable,
      deleteTable,
      createView,
      renameView,
      deleteView,
    }),
    [
      baseId,
      activeTableId,
      activeViewId,
      base,
      tables,
      views,
      activeTable,
      activeView,
      isLoadingBase,
      isLoadingTables,
      isLoadingViews,
      selectTable,
      selectView,
      selectTableAndView,
      createTable,
      renameTable,
      deleteTable,
      createView,
      renameView,
      deleteView,
    ],
  );

  return <BaseContext.Provider value={value}>{children}</BaseContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBaseContext() {
  const context = useContext(BaseContext);
  if (!context) {
    throw new Error("useBaseContext must be used within BaseContextProvider");
  }
  return context;
}

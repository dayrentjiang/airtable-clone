"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { api } from "~/trpc/react";
import type { BaseContextValue, BaseContextProviderProps } from "./types";

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
// CONTEXT
// ============================================================================

export const BaseContext = createContext<BaseContextValue | null>(null);

BaseContext.displayName = "BaseContext";

// ============================================================================
// PROVIDER
// ============================================================================

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
    // Resolve temp ID to real ID if the server has already responded
    const resolvedId = tempIdMapRef.current.get(tableId) ?? tableId;
    setActiveTableId(resolvedId);
    // Reset view - will auto-select first view when views load
    setActiveViewId(null);
  }, []);

  const selectView = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  const selectTableAndView = useCallback((tableId: string, viewId: string) => {
    setActiveTableId(tableId);
    setActiveViewId(viewId);
  }, []);

  // -------------------------------------------------------------------------
  // TABLE OPERATIONS
  // -------------------------------------------------------------------------

  const utils = api.useUtils();

  // Track temp ID to real ID mapping for optimistic updates
  const tempIdMapRef = useRef<Map<string, string>>(new Map());
  // Allows callers to pass a temp ID into onMutate so both sides use the same ID
  const pendingTempIdRef = useRef<string | null>(null);

  const createTableMutation = api.table.create.useMutation({
    onMutate: async (variables) => {
      await utils.table.getAllByBase.cancel({ baseId });

      const previousTables = utils.table.getAllByBase.getData({ baseId });

      // Use the caller-provided temp ID if available, otherwise generate one
      const tempId = pendingTempIdRef.current ?? `temp-${Date.now()}`;
      pendingTempIdRef.current = null;
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
      if (
        variables.id === activeTableId &&
        previousTables &&
        previousTables.length > 1
      ) {
        const remainingTables = previousTables.filter(
          (t) => t.id !== variables.id,
        );
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
    async (name: string, tempId?: string) => {
      if (tempId) pendingTempIdRef.current = tempId;
      return await createTableMutation.mutateAsync({ baseId, name });
    },
    [baseId, createTableMutation],
  );

  const renameTable = useCallback(
    (tableId: string, name: string) => {
      // Resolve temp ID to real ID if the server has already responded
      const resolvedId = tempIdMapRef.current.get(tableId) ?? tableId;
      renameTableMutation.mutate({ id: resolvedId, name });
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
    onSuccess: (newView, variables) => {
      // Use tableId from mutation variables instead of closure
      void utils.view.getByTableId.invalidate({ tableId: variables.tableId });
      setActiveViewId(newView.id);
    },
  });

  const renameViewMutation = api.view.rename.useMutation({
    onMutate: async (variables) => {
      // Find the tableId from the view being renamed
      const viewToRename = views?.find((v) => v.id === variables.id);
      const tableId = viewToRename?.tableId;

      if (!tableId) {
        // If we can't find the view, return empty context
        return {
          previousViews: undefined,
          previousView: undefined,
          tableId: undefined,
        };
      }

      await utils.view.getByTableId.cancel({ tableId });
      await utils.view.getById.cancel({ id: variables.id });

      const previousViews = utils.view.getByTableId.getData({ tableId });
      const previousView = utils.view.getById.getData({ id: variables.id });

      // Update views list
      if (previousViews) {
        utils.view.getByTableId.setData({ tableId }, (old) =>
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

      return { previousViews, previousView, tableId };
    },
    onError: (_err, variables, context) => {
      if (!context?.tableId) return;

      if (context.previousViews) {
        utils.view.getByTableId.setData(
          { tableId: context.tableId },
          context.previousViews,
        );
      }
      if (context.previousView) {
        utils.view.getById.setData({ id: variables.id }, context.previousView);
      }
    },
    onSettled: (_data, _error, variables, context) => {
      if (!context?.tableId) return;

      void utils.view.getByTableId.invalidate({ tableId: context.tableId });
      void utils.view.getById.invalidate({ id: variables.id });
    },
  });

  const deleteViewMutation = api.view.delete.useMutation({
    onMutate: async (variables) => {
      // Find the tableId from the view being deleted
      const viewToDelete = views?.find((v) => v.id === variables.id);
      const tableId = viewToDelete?.tableId;

      if (!tableId) {
        // If we can't find the view, return empty context
        return { previousViews: undefined, tableId: undefined };
      }

      await utils.view.getByTableId.cancel({ tableId });

      const previousViews = utils.view.getByTableId.getData({ tableId });

      utils.view.getByTableId.setData({ tableId }, (old) => {
        if (!old) return old;
        return old.filter((view) => view.id !== variables.id);
      });

      // If deleting active view, select another
      if (
        variables.id === activeViewId &&
        previousViews &&
        previousViews.length > 1
      ) {
        const remainingViews = previousViews.filter(
          (v) => v.id !== variables.id,
        );
        if (remainingViews.length > 0) {
          setActiveViewId(remainingViews[0]!.id);
        }
      }

      return { previousViews, tableId };
    },
    onError: (_err, _variables, context) => {
      if (!context?.tableId || !context?.previousViews) return;

      utils.view.getByTableId.setData(
        { tableId: context.tableId },
        context.previousViews,
      );
    },
    onSettled: (_data, _error, _variables, context) => {
      if (!context?.tableId) return;

      void utils.view.getByTableId.invalidate({ tableId: context.tableId });
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

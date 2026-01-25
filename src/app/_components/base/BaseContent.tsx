"use client";

import { useState, useEffect, useRef } from "react";
import { TableBar } from "./TableBar";
import { ViewToolbar } from "./ViewToolbar";
import { BaseSideNav } from "./BaseSideNav";
import { DataGrid, SelectionProvider, useSelection } from "./DataGrid";
import { IconSidebar } from "../layout/IconSidebar";
import { BaseTopNav } from "./BaseTopNav";
import { ViewConfigProvider } from "./hooks/useViewConfig";
import { api } from "~/trpc/react";

interface BaseContentProps {
  baseId: string;
  userInitial: string;
}

// Inner component that uses the selection context
function BaseContentInner({
  baseId,
  userInitial,
  activeTableId,
  activeViewId,
  setActiveTableId,
  setActiveViewId,
}: BaseContentProps & {
  activeTableId: string | null;
  activeViewId: string | null;
  setActiveTableId: (id: string | null) => void;
  setActiveViewId: (id: string | null) => void;
}) {
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const dataGridRef = useRef<HTMLDivElement>(null);
  const { clearSelection } = useSelection();

  // Get TRPC utils for cache invalidation
  const utils = api.useUtils();

  // Fetch tables for this base dynamically
  const { data: tables = [] } = api.table.getAllByBase.useQuery(
    { baseId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Auto-select first table if no table is selected
  useEffect(() => {
    if (tables.length > 0 && !activeTableId) {
      setActiveTableId(tables[0]!.id);
    }
  }, [tables, activeTableId, setActiveTableId]);

  // Fetch views for the active table to auto-select the first one
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch
      gcTime: 0, // Don't cache
    },
  );

  // Auto-select first view when views load or table changes
  useEffect(() => {
    if (views && views.length > 0 && !activeViewId) {
      setActiveViewId(views[0]!.id);
    }
  }, [views, activeViewId, setActiveViewId]);

  // Reset view when table changes
  useEffect(() => {
    setActiveViewId(null);
  }, [activeTableId, setActiveViewId]);

  const createTableMutation = api.table.create.useMutation({
    onSuccess: (newTable) => {
      // Refetch tables to include the new one
      void utils.table.getAllByBase.invalidate({ baseId });
      // Select the newly created table
      setActiveTableId(newTable.id);
    },
  });

  const handleAddTable = (name: string) => {
    createTableMutation.mutate({
      baseId,
      name,
    });
  };

  const toggleSideNav = () => {
    setIsSideNavOpen((prev) => !prev);
  };

  // Clear selection when clicking outside the data grid
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dataGridRef.current &&
        !dataGridRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clearSelection]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Icon sidebar - far left */}
      <IconSidebar userInitial={userInitial} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Base Top Nav - Data/Automations/Interfaces/Forms tabs */}
        <BaseTopNav baseName="Untitled Base" />

        {/* Table bar */}
        <TableBar
          tables={tables}
          activeTableId={activeTableId}
          onTableSelect={setActiveTableId}
          onAddTable={handleAddTable}
        />
        {/* ViewConfigProvider wraps toolbar + grid so they share state */}
        <ViewConfigProvider viewId={activeViewId}>
          <ViewToolbar
            onToggleSideNav={toggleSideNav}
            tableId={activeTableId ?? ""}
          />

          {/* Content with side nav and main area */}
          <div className="flex flex-1 overflow-hidden">
            {isSideNavOpen && (
              <BaseSideNav
                tableId={activeTableId}
                selectedViewId={activeViewId}
                onViewSelect={setActiveViewId}
              />
            )}

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Data grid */}
              <main className="flex-1 overflow-auto bg-gray-50" ref={dataGridRef}>
                {activeTableId && activeViewId ? (
                  <DataGrid
                    key={activeViewId}
                    tableId={activeTableId}
                    viewId={activeViewId}
                  />
                ) : activeTableId ? (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    Loading view...
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    No table selected. Create a table to get started.
                  </div>
                )}
              </main>
            </div>
          </div>
        </ViewConfigProvider>
      </div>
    </div>
  );
}

export function BaseContent({ baseId, userInitial }: BaseContentProps) {
  // Default to first table if available
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch views to get the total row/column count for SelectionProvider
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch
      gcTime: 0, // Don't cache
    },
  );

  return (
    <SelectionProvider totalRows={100} totalColumns={10}>
      <BaseContentInner
        baseId={baseId}
        userInitial={userInitial}
        activeTableId={activeTableId}
        activeViewId={activeViewId}
        setActiveTableId={setActiveTableId}
        setActiveViewId={setActiveViewId}
      />
    </SelectionProvider>
  );
}

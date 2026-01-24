"use client";

import { useState, useEffect, useRef } from "react";
import { TableBar } from "./TableBar";
import { ViewToolbar } from "./ViewToolbar";
import { BaseSideNav } from "./BaseSideNav";
import { DataGrid, SelectionProvider, useSelection } from "./DataGrid";
import { IconSidebar } from "../layout/IconSidebar";
import { BaseTopNav } from "./BaseTopNav";
import { api } from "~/trpc/react";

interface Table {
  id: string;
  name: string;
}

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  userInitial: string;
}

// Inner component that uses the selection context
function BaseContentInner({
  baseId,
  tables,
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

  // Fetch views for the active table to auto-select the first one
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 30_000,   // 30s freshness
      gcTime: 5 * 60_000,  // 5min cache
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

  const handleAddTable = () => {
    // TODO: Implement add table modal
    console.log("Add table clicked");
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
        <ViewToolbar onToggleSideNav={toggleSideNav} />

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
                <DataGrid tableId={activeTableId} viewId={activeViewId} />
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
      </div>
    </div>
  );
}

export function BaseContent({ baseId, tables, userInitial }: BaseContentProps) {
  // Default to first table if available
  const [activeTableId, setActiveTableId] = useState<string | null>(
    tables[0]?.id ?? null,
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch views to get the total row/column count for SelectionProvider
  const { data: views } = api.view.getByTableId.useQuery(
    { tableId: activeTableId! },
    {
      enabled: !!activeTableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 30_000,   // 30s freshness
      gcTime: 5 * 60_000,  // 5min cache
    },
  );

  return (
    <SelectionProvider totalRows={100} totalColumns={10}>
      <BaseContentInner
        baseId={baseId}
        tables={tables}
        userInitial={userInitial}
        activeTableId={activeTableId}
        activeViewId={activeViewId}
        setActiveTableId={setActiveTableId}
        setActiveViewId={setActiveViewId}
      />
    </SelectionProvider>
  );
}

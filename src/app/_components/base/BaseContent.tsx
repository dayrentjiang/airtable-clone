"use client";

import { useState } from "react";
import { TableBar } from "./TableBar";
import { ViewToolbar } from "./ViewToolbar";
import { BaseSideNav } from "./BaseSideNav";
import { DataGrid } from "./DataGrid";
import { IconSidebar } from "../layout/IconSidebar";
import { BaseTopNav } from "./BaseTopNav";

interface Table {
  id: string;
  name: string;
}

interface BaseContentProps {
  baseId: string;
  tables: Table[];
  userInitial: string;
}

export function BaseContent({ baseId, tables, userInitial }: BaseContentProps) {
  // Default to first table if available
  const [activeTableId, setActiveTableId] = useState<string | null>(
    tables[0]?.id ?? null,
  );

  const handleAddTable = () => {
    // TODO: Implement add table modal
    console.log("Add table clicked");
  };

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
        <ViewToolbar />

        {/* Content with side nav and main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Side nav */}
          <BaseSideNav userInitial={userInitial} />

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Data grid */}
            <main className="flex-1 overflow-auto bg-gray-50">
              {activeTableId ? (
                <DataGrid tableId={activeTableId} />
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

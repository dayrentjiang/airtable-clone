"use client";

interface Table {
  id: string;
  name: string;
}

interface TableBarProps {
  tables: Table[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddTable: () => void;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export function TableBar({
  tables,
  activeTableId,
  onTableSelect,
  onAddTable,
}: TableBarProps) {
  const activeTable = tables.find((t) => t.id === activeTableId);

  return (
    <div className="flex h-11 items-center justify-between border-b border-gray-200 bg-white px-3">
      {/* Left: Table tabs */}
      <div className="flex items-center gap-1">
        {/* Active table dropdown */}
        <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <TableIcon />
          <span>{activeTable?.name ?? "Table 1"}</span>
          <ChevronDownIcon className="text-gray-500" />
        </button>

        {/* Chevron separator */}
        <ChevronDownIcon className="-rotate-90 text-gray-300" />

        {/* Add or import */}
        <button
          onClick={onAddTable}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <PlusIcon />
          <span>Add or import</span>
        </button>
      </div>

      {/* Right: Tools */}
      <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
        <span>Tools</span>
        <ChevronDownIcon className="text-gray-500" />
      </button>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Type,
  Hash,
  Link2,
  AlignLeft,
  File,
  CheckSquare,
  ChevronDown,
  Calendar,
  FileText,
  Star,
  Image,
  Link,
  Sparkles,
  Search,
  Building2,
  Boxes,
  PenTool,
  Microscope,
  ShoppingCart,
  BookOpen,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useSelection } from "../hooks/useSelection";
import { TextColumnPanel, NumberColumnPanel } from "./ColumnNamingPanel/index";

interface AddColumnButtonProps {
  tableId: string;
}

interface FieldType {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: "TEXT" | "NUMBER"; // Add more types as you implement them
  iconRight?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

interface FieldSection {
  title: string;
  fields: FieldType[];
}

const FIELD_SECTIONS: FieldSection[] = [
  {
    title: "Field agents",
    fields: [
      { icon: FileText, label: "Analyze attachment", disabled: true },
      { icon: Building2, label: "Research companies", disabled: true },
      { icon: Image, label: "Find image from web", disabled: true },
      { icon: Sparkles, label: "Generate image", disabled: true },
      { icon: Boxes, label: "Categorize assets", disabled: true },
      { icon: PenTool, label: "Build prototype", disabled: true },
      { icon: Microscope, label: "Build a field agent", disabled: true },
      { icon: ShoppingCart, label: "Browse catalog", disabled: true },
    ],
  },
  {
    title: "Standard fields",
    fields: [
      {
        icon: Link2,
        label: "Link to another record",
        iconRight: <ChevronDown className="h-3 w-3" />,
        disabled: true,
      },
      { icon: Type, label: "Single line text", type: "TEXT" },
      { icon: AlignLeft, label: "Long text", disabled: true },
      { icon: File, label: "Attachment", disabled: true },
      { icon: CheckSquare, label: "Checkbox", disabled: true },
      { icon: ChevronDown, label: "Multiple select", disabled: true },
      { icon: ChevronDown, label: "Single select", disabled: true },
      { icon: Star, label: "User", disabled: true },
      { icon: Calendar, label: "Date", disabled: true },
      { icon: Hash, label: "Number", type: "NUMBER" },
      { icon: Type, label: "Phone number", disabled: true },
      { icon: Type, label: "Email", disabled: true },
      { icon: Link, label: "URL", disabled: true },
      { icon: BookOpen, label: "Duration", disabled: true },
      { icon: Star, label: "Rating", disabled: true },
      { icon: Type, label: "Barcode", disabled: true },
      { icon: Sparkles, label: "Button", disabled: true },
    ],
  },
];

interface FieldOptionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

function FieldOption({
  icon: Icon,
  label,
  iconRight,
  disabled = false,
  onClick,
}: FieldOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm ${
        disabled
          ? "cursor-not-allowed text-gray-400"
          : "cursor-pointer text-gray-700 hover:bg-blue-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {iconRight && <div className="text-gray-400">{iconRight}</div>}
    </button>
  );
}

export function AddColumnButton({ tableId }: AddColumnButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNamingOpen, setIsNamingOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"TEXT" | "NUMBER" | null>(
    null,
  );
  const [columnName, setColumnName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<"left" | "right">("left");
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const { clearSelection } = useSelection();

  // Calculate menu position based on available space
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 680; // w-80 = 320px

      // Check if there's enough space to align right edge with button's right edge
      const spaceOnLeft = buttonRect.right - menuWidth;

      // If not enough space on left (menu would go off-screen), align left edges
      if (spaceOnLeft < 0) {
        setMenuPosition("right"); // Align left edge with left edge
      } else {
        setMenuPosition("left"); // Align right edge with right edge (default)
      }
    }
  }, [isMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setSearchQuery("");
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isMenuOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMenuOpen]);

  const createColumnMutation = api.column.create.useMutation({
    onMutate: async (newColumn) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await utils.table.getById.cancel({ id: tableId });

      // Snapshot the previous value
      const previousTable = utils.table.getById.getData({ id: tableId });

      // Optimistically update the table with the new column
      if (previousTable) {
        const lastColumn =
          previousTable.columns[previousTable.columns.length - 1];
        const newOrder = (lastColumn?.order ?? -1) + 1;

        utils.table.getById.setData(
          { id: tableId },
          {
            ...previousTable,
            columns: [
              ...previousTable.columns,
              {
                id: `temp-${Date.now()}`, // Temporary ID
                name: newColumn.name,
                type: newColumn.type,
                tableId: tableId,
                order: newOrder,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        );
      }

      // Close the naming panel immediately (optimistic)
      setIsNamingOpen(false);
      setSelectedType(null);
      setColumnName("");

      // Return context with previous data
      return { previousTable };
    },
    onError: (err, newColumn, context) => {
      // If mutation fails, roll back to previous value
      if (context?.previousTable) {
        utils.table.getById.setData({ id: tableId }, context.previousTable);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      void utils.table.getById.invalidate({ id: tableId });
    },
  });

  const handleSelectType = (type: "TEXT" | "NUMBER") => {
    setSelectedType(type);
    setIsMenuOpen(false);
    setSearchQuery("");
    setIsNamingOpen(true);
    setColumnName("");
    // Clear any cell selection so keyboard input works in the name input
    clearSelection();
  };

  // Get field sections with onClick handlers
  const getFieldSectionsWithHandlers = (): FieldSection[] => {
    return FIELD_SECTIONS.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        // Add onClick handlers for fields that have a type defined
        if (field.type && !field.disabled) {
          return {
            ...field,
            onClick: () => handleSelectType(field.type!),
          };
        }
        return field;
      }),
    }));
  };

  const handleCreateColumn = () => {
    if (columnName.trim() && selectedType) {
      createColumnMutation.mutate({
        tableId,
        name: columnName.trim(),
        type: selectedType,
      });
    }
  };

  const handleCancel = () => {
    setIsNamingOpen(false);
    setSelectedType(null);
    setColumnName("");
  };

  return (
    <div className="shrink-0 pr-20">
      {/* Header cell with + button - matches th padding */}
      <div
        ref={buttonRef}
        className="sticky top-0 z-10 flex w-23 cursor-pointer items-center justify-center border-r border-b border-gray-300 bg-gray-50 px-2 py-2 hover:bg-gray-100"
        onClick={() => {
          setIsMenuOpen(!isMenuOpen);
          // Clear selection when opening the menu
          clearSelection();
        }}
      >
        <div
          ref={menuRef}
          className="relative flex h-full w-full items-center justify-center"
        >
          <div className="text-gray-400">
            <Plus className="h-4 w-4" />
          </div>

          {/* Type selection dropdown */}
          {isMenuOpen && (
            <div
              className={`absolute top-5 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg ${
                menuPosition === "left" ? "right-0" : "left-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search bar */}
              <div className="border-b border-gray-200 p-3">
                <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find a field type"
                    className="flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto py-2">
                {getFieldSectionsWithHandlers().map((section) => (
                  <div key={section.title} className="px-2 py-1">
                    <div className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 first:pt-0">
                      {section.title}
                    </div>
                    {section.fields.map((field) => (
                      <FieldOption
                        key={field.label}
                        icon={field.icon}
                        label={field.label}
                        iconRight={field.iconRight}
                        disabled={field.disabled}
                        onClick={field.onClick}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <TextColumnPanel
            isOpen={isNamingOpen && selectedType === "TEXT"}
            columnName={columnName}
            isCreating={createColumnMutation.isPending}
            onNameChange={setColumnName}
            onCancel={handleCancel}
            onCreate={handleCreateColumn}
          />

          <NumberColumnPanel
            isOpen={isNamingOpen && selectedType === "NUMBER"}
            columnName={columnName}
            isCreating={createColumnMutation.isPending}
            onNameChange={setColumnName}
            onCancel={handleCancel}
            onCreate={handleCreateColumn}
          />
        </div>
      </div>
    </div>
  );
}

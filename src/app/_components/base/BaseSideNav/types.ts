import type { LucideIcon } from "lucide-react";

export interface ViewType {
  type: "GRID" | "CALENDAR" | "GALLERY" | "KANBAN" | "FORM";
  label: string;
  Icon: LucideIcon;
  enabled: boolean;
  team?: boolean;
  color?: string;
}

export interface ExtendedViewType {
  type: string;
  label: string;
  Icon: LucideIcon;
  enabled: boolean;
  team?: boolean;
  color?: string;
}

export interface BaseSideNavProps {
  baseId: string;
  tableId: string | null;
  selectedViewId: string | null;
  onViewSelect: (viewId: string) => void;
}

export interface ViewContextMenuProps {
  viewId: string;
  viewName: string;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export interface ViewItemProps {
  viewId: string;
  viewName: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

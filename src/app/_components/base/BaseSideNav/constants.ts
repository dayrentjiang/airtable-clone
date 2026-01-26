import {
  Grid3X3,
  Calendar,
  Image,
  Columns3,
  FileText,
  GanttChart,
  List,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";
import type { ViewType, ExtendedViewType } from "./types";

export const VIEW_TYPES: ViewType[] = [
  { type: "GRID", label: "Grid", Icon: Grid3X3, enabled: true },
  { type: "CALENDAR", label: "Calendar", Icon: Calendar, enabled: false },
  { type: "GALLERY", label: "Gallery", Icon: Image, enabled: false },
  {
    type: "KANBAN",
    label: "Kanban",
    Icon: Columns3,
    enabled: false,
    color: "text-purple-500",
  },
  { type: "FORM", label: "Form", Icon: FileText, enabled: false },
];

export const EXTENDED_VIEW_TYPES: ExtendedViewType[] = [
  {
    type: "TIMELINE",
    label: "Timeline",
    Icon: GanttChart,
    enabled: false,
    team: true,
    color: "text-red-500",
  },
  { type: "LIST", label: "List", Icon: List, enabled: false },
  {
    type: "GANTT",
    label: "Gantt",
    Icon: ClipboardList,
    enabled: false,
    team: true,
  },
  {
    type: "SECTION",
    label: "Section",
    Icon: LayoutGrid,
    enabled: false,
    team: true,
  },
];

export const ALL_VIEW_TYPES = [...VIEW_TYPES, ...EXTENDED_VIEW_TYPES];

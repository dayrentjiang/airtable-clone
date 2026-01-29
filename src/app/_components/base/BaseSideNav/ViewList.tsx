"use client";

import { ViewItem } from "./ViewItem";

interface View {
  id: string;
  name: string;
}

interface ViewListProps {
  views: View[] | undefined;
  isLoading: boolean;
  selectedViewId: string | null;
  onViewSelect: (viewId: string) => void;
  onViewRename: (viewId: string, newName: string) => void;
  onViewDelete: (viewId: string) => void;
}

export function ViewList({
  views,
  isLoading,
  selectedViewId,
  onViewSelect,
  onViewRename,
  onViewDelete,
}: ViewListProps) {
  if (isLoading) {
    return <div className="px-2.5 py-2 text-xs text-gray-500">Loading...</div>;
  }

  if (!views || views.length === 0) {
    return (
      <div className="px-2.5 py-2 text-xs text-gray-500">No views found</div>
    );
  }

  return (
    <div>
      {views.map((view) => (
        <ViewItem
          key={view.id}
          viewId={view.id}
          viewName={view.name}
          isSelected={view.id === selectedViewId}
          onSelect={() => onViewSelect(view.id)}
          onRename={(newName) => onViewRename(view.id, newName)}
          onDelete={() => onViewDelete(view.id)}
          existingViewNames={views.map((v) => v.name)}
        />
      ))}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Settings } from "lucide-react";
import { api } from "~/trpc/react";
import { useBaseContext } from "./hooks/useBaseContext";
import type { BaseSideNavProps } from "./BaseSideNav/types";
import { CreateViewDropdown } from "./BaseSideNav/CreateViewDropdown";
import { CreateViewModal } from "./BaseSideNav/CreateViewModal";
import { ViewList } from "./BaseSideNav/ViewList";
import { ViewSearchResults } from "./BaseSideNav/ViewSearchResults";

export function BaseSideNav({
  baseId,
  tableId,
  selectedViewId,
  onViewSelect,
  onTableAndViewSelect,
}: BaseSideNavProps) {
  // Get data from context instead of querying directly
  // This eliminates the duplicate query - context already has the views!
  const {
    views,
    isLoadingViews: isLoading,
    createView: createViewFromContext,
    renameView: renameViewFromContext,
    deleteView: deleteViewFromContext,
  } = useBaseContext();
  
  const [isCreatingView, setIsCreatingView] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingViewType, setPendingViewType] = useState<
    "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM" | null
  >(null);
  const [viewName, setViewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when searching is enabled
  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  // Create view - now uses context method
  const handleCreateView = async (
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
    name: string,
  ) => {
    if (!tableId) return;
    
    setIsCreatingView(true);
    try {
      const newView = await createViewFromContext(tableId, name, type);
      onViewSelect(newView.id);
      setIsDropdownOpen(false);
      setIsModalOpen(false);
      setPendingViewType(null);
      setViewName("");
    } finally {
      setIsCreatingView(false);
    }
  };

  // Rename view - now uses context method
  const handleRenameView = (viewId: string, name: string) => {
    renameViewFromContext(viewId, name);
  };

  // Delete view - now uses context method
  const handleDeleteView = (viewId: string) => {
    deleteViewFromContext(viewId);
    
    // If deleted view was selected, select the first available view
    if (viewId === selectedViewId && views && views.length > 1) {
      const remainingView = views.find((v) => v.id !== viewId);
      if (remainingView) {
        onViewSelect(remainingView.id);
      }
    }
  };

  const handleViewTypeClick = (
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => {
    if (!tableId) return;

    // Generate a default name based on existing views
    const existingCount = views?.filter((v) => v.type === type).length ?? 0;
    const defaultName =
      existingCount === 0
        ? type.charAt(0) + type.slice(1).toLowerCase()
        : `${type.charAt(0) + type.slice(1).toLowerCase()} ${existingCount + 1}`;

    setViewName(defaultName);
    setPendingViewType(type);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCreateViewClick = () => {
    if (!tableId || !pendingViewType || !viewName.trim()) return;
    void handleCreateView(pendingViewType, viewName.trim());
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setPendingViewType(null);
    setViewName("");
  };

  const handleViewRename = (viewId: string, newName: string) => {
    handleRenameView(viewId, newName);
  };

  const handleViewDelete = (viewId: string) => {
    handleDeleteView(viewId);
  };

  // Use global search when searching, otherwise filter local views
  const { data: globalSearchResults, isLoading: isSearchLoading } =
    api.view.searchGlobal.useQuery(
      {
        query: searchQuery,
        currentTableId: tableId ?? undefined,
      },
      {
        enabled: !!searchQuery && searchQuery.length > 0,
        staleTime: 1000, // Cache for 1 second
      },
    );

  // Filter views based on search query (local or global)
  const filteredViews = searchQuery
    ? globalSearchResults?.currentTableViews
    : views?.filter((view) =>
        view.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

  const handleSearchToggle = () => {
    setIsSearching(true);
  };

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearching(false);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  // Shared styles for search container - define once, use everywhere
  const searchContainerStyles =
    "flex flex-1 items-center gap-2 rounded border-2 px-2.5 py-1";
  const searchIconStyles = "h-3 w-3 shrink-0 text-gray-700";
  const settingsButtonStyles =
    "shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700";
  const clearButtonStyles =
    "shrink-0 text-sm leading-none text-gray-500 hover:text-gray-700";

  return (
    <aside className="flex w-70 flex-col border-r border-gray-200 bg-gray-50/50">
      {/* Top section */}
      <div className="flex-1 px-2 py-2.5">
        {/* Create new */}
        <CreateViewDropdown
          isOpen={isDropdownOpen}
          onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
          onViewTypeSelect={handleViewTypeClick}
          dropdownRef={dropdownRef}
        />

        {/* Find a view */}
        <div className="mt-2 flex items-center gap-2">
          {isSearching ? (
            <div className={`${searchContainerStyles} border-blue-700`}>
              <Search className={searchIconStyles} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={handleSearchBlur}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleSearchClear();
                  }
                }}
                placeholder="Find a view"
                className="min-w-0 flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-500"
              />
              <button
                onClick={handleSearchClear}
                className={`${clearButtonStyles} ${!searchQuery ? "pointer-events-none invisible" : ""}`}
              >
                ×
              </button>
              <button className={settingsButtonStyles}>
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={handleSearchToggle}
              className={`${searchContainerStyles} border-transparent text-xs text-gray-700 hover:cursor-text`}
            >
              <Search className={searchIconStyles} />
              <span>Find a view</span>
              <button
                className={`${settingsButtonStyles} ml-auto`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle settings click
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Views list */}
        <div className="mt-3 space-y-0">
          {searchQuery ? (
            <ViewSearchResults
              baseId={baseId}
              currentTableViews={globalSearchResults?.currentTableViews}
              otherTableViews={globalSearchResults?.otherTableViews}
              onViewSelect={onViewSelect}
              onTableAndViewSelect={onTableAndViewSelect}
              selectedViewId={selectedViewId ?? undefined}
              isLoading={isSearchLoading}
            />
          ) : (
            <ViewList
              views={filteredViews}
              isLoading={isLoading}
              selectedViewId={selectedViewId}
              onViewSelect={onViewSelect}
              onViewRename={handleViewRename}
              onViewDelete={handleViewDelete}
            />
          )}
        </div>
      </div>

      {/* Create View Modal */}
      {isModalOpen && (
        <CreateViewModal
          viewName={viewName}
          onViewNameChange={setViewName}
          onCancel={handleCancelModal}
          onCreate={handleCreateViewClick}
          isCreating={isCreatingView}
          existingViewNames={views?.map((view) => view.name) ?? []}
        />
      )}
    </aside>
  );
}

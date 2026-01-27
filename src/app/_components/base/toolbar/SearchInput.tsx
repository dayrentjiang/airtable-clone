"use client";

import { useState, useEffect, useRef } from "react";
import { useViewConfig } from "../hooks/useViewConfig";
import { createPortal } from "react-dom";

/**
 * SEARCH INPUT COMPONENT
 *
 * HOW SEARCH WORKS AT THE DATABASE LEVEL:
 *
 * 1. User types "john" in search box
 * 2. After 300ms of no typing (debounce), we update the search state
 * 3. The search value is passed to `row.infiniteWithView` query
 * 4. On the server, `buildSearchCondition()` creates SQL:
 *
 *    WHERE (
 *      data->>'name_column_id' ILIKE '%john%'
 *      OR data->>'email_column_id' ILIKE '%john%'
 *      OR data->>'notes_column_id' ILIKE '%john%'
 *    )
 *
 * 5. PostgreSQL searches across ALL text columns using ILIKE (case-insensitive)
 * 6. Only matching rows are returned to the client
 *
 * WHY DEBOUNCING?
 * - Without debounce: typing "john" = 4 API calls (j, jo, joh, john)
 * - With debounce: typing "john" = 1 API call after user stops
 * - This reduces server load and improves UX
 */

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "Find in view",
}: SearchInputProps) {
  const {
    search,
    setSearch,
    searchMatchCount,
    currentMatchIndex,
    goToNextMatch,
    goToPrevMatch,
  } = useViewConfig();

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(search);
  const [isExpanded, setIsExpanded] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync local value when search changes externally (e.g., view switch)
  useEffect(() => {
    setLocalValue(search);
    // Only collapse if search is cleared externally AND popover is not currently open
    // This prevents auto-closing when user deletes all text while typing
    if (!search && !isExpanded) {
      setIsExpanded(false);
    }
  }, [search, isExpanded]);

  // Calculate popover position when expanding
  useEffect(() => {
    if (isExpanded && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 8,
        left: rect.right - 384, // 384px = w-96
      });
    }
  }, [isExpanded]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  // ---------------------------------------------------------------------------
  // DEBOUNCE LOGIC
  // ---------------------------------------------------------------------------
  // This is the key part! We wait 300ms after user stops typing
  // before updating the actual search state (which triggers the query)

  useEffect(() => {
    // Start a timer when localValue changes
    const timer = setTimeout(() => {
      // After 300ms, update the actual search state
      setSearch(localValue);
    }, 300);

    // If user types again before 300ms, cancel the previous timer
    // This is what makes it "debounced" - only the last value triggers
    return () => clearTimeout(timer);
  }, [localValue, setSearch]);

  // ---------------------------------------------------------------------------
  // UI HANDLERS
  // ---------------------------------------------------------------------------

  const handleExpand = () => {
    setIsExpanded(true);
    // Focus input after expansion animation
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setLocalValue("");
    setSearch("");
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Collapsed state: just show icon button
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleExpand}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="Search"
      >
        <SearchIcon />
      </button>

      {/* Popover */}
      {isExpanded &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            {/* Search input bar */}
            <div className="flex items-center gap-2 p-2">
              <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 rounded px-2 py-1.5 text-xs outline-none placeholder:text-gray-400"
              />

              {/* Ask Omni button */}
              <button className="shrink-0 rounded bg-black px-2 py-1 text-xs font-medium text-white hover:bg-gray-800">
                Ask Omni
              </button>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Close search"
              >
                <CloseIcon />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

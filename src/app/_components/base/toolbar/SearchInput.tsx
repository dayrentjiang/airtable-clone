"use client";

import { useState, useEffect, useRef } from "react";
import { useViewConfig } from "../hooks/useViewConfig";

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

export function SearchInput({ placeholder = "Find in view" }: SearchInputProps) {
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when search changes externally (e.g., view switch)
  useEffect(() => {
    setLocalValue(search);
    // Collapse if search is cleared externally
    if (!search) {
      setIsExpanded(false);
    }
  }, [search]);

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
  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="Search"
      >
        <SearchIcon />
      </button>
    );
  }

  // Expanded state: show search input with match counter and navigation
  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-32 border-none bg-transparent text-xs outline-none placeholder:text-gray-400"
      />

      {/* Match counter: "1 of 4" */}
      {search && (
        <span className="whitespace-nowrap text-xs text-gray-500">
          {searchMatchCount > 0
            ? `${currentMatchIndex + 1} of ${searchMatchCount}`
            : "0 results"}
        </span>
      )}

      {/* Navigation arrows */}
      {search && searchMatchCount > 0 && (
        <>
          <button
            onClick={goToPrevMatch}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Previous match"
          >
            <ChevronUpIcon />
          </button>
          <button
            onClick={goToNextMatch}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Next match"
          >
            <ChevronDownIcon />
          </button>
        </>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Close search"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

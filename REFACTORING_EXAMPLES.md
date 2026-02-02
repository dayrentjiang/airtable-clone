# DataGrid Refactoring: Step-by-Step Example

This document shows **exactly** what code changes from current to refactored state.

---

## Example 1: DirectEditableCell - State Management

### BEFORE (Current - Complex)

```tsx
// DirectEditableCell.tsx - Lines 40-90 (50 lines of state management)

export function DirectEditableCell({
  rowIndex,
  rowId,
  tableId,
  columnId,
  columnIndex,
  columnType,
  value: initialValue,      // ← Prop from parent
  searchTerm,               // ← For highlighting
  filters,                  // ← For highlighting
  sorts,                    // ← For highlighting
}: DirectEditableCellProps) {
  // LOCAL STATE (duplicates data from props!)
  const [value, setValue] = useState(String(initialValue ?? ""));
  const [displayValue, setDisplayValue] = useState<string | number | null>(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  const previousValueRef = useRef<string | number | null>(initialValue);
  const hasSavedRef = useRef(false);
  
  // SYNC EFFECT #1: Keep value in sync with prop
  useEffect(() => {
    if (isEditing) return; // Don't sync while editing
    if (initialValue !== previousValueRef.current && initialValue !== displayValue) {
      setValue(String(initialValue ?? ""));
      setDisplayValue(initialValue);
    }
    previousValueRef.current = initialValue;
  }, [initialValue, isEditing, displayValue]);
  
  // SYNC EFFECT #2: Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      hasSavedRef.current = false;
    }
  }, [isEditing]);
  
  // MUTATION: Optimistic update of displayValue
  const updateCellMutation = api.row.updateCell.useMutation({
    onMutate: async (variables) => {
      await utils.row.infiniteWithView.cancel();
      
      // Update LOCAL state optimistically
      if (variables.columnId === columnId && variables.rowId === rowId) {
        setDisplayValue(variables.value);
        setValue(variables.value?.toString() ?? "");
      }
      
      return { previousDisplayValue: displayValue };
    },
    onSuccess: () => {
      void utils.row.infiniteWithView.invalidate({ tableId });
    },
    onError: (err, _variables, context) => {
      // Revert LOCAL state on error
      if (context?.previousDisplayValue !== undefined) {
        setDisplayValue(context.previousDisplayValue);
        setValue(context.previousDisplayValue?.toString() ?? "");
      }
    },
  });
  
  // Complex save logic...
  const handleSave = () => {
    if (hasSavedRef.current) {
      stopEditing();
      return;
    }
    
    let finalValue: string | number | null = value;
    
    // Validation...
    if (columnType === "NUMBER") {
      const numValue = parseFloat(value);
      if (value !== "" && !isNaN(numValue)) {
        finalValue = numValue;
      } else if (value === "") {
        finalValue = null;
      } else {
        setValue(String(initialValue ?? ""));
        setDisplayValue(initialValue);
        stopEditing();
        return;
      }
    }
    
    setDisplayValue(finalValue);  // Update local state
    
    if (finalValue !== initialValue) {
      updateCellMutation.mutate({ rowId, columnId, value: finalValue });
    }
    
    hasSavedRef.current = true;
    stopEditing();
  };
  
  // ... 300 more lines
}
```

**Problems**:
- ❌ 5 pieces of local state that duplicate prop data
- ❌ 2 useEffects just to keep state in sync
- ❌ Complex mutation with manual optimistic updates
- ❌ Error handling that manually reverts state
- ❌ 11 props passed from parent

---

### AFTER (Refactored - Simple)

```tsx
// DirectEditableCell.tsx - NEW VERSION (Clean)

export function DirectEditableCell({
  rowIndex,
  columnIndex,
}: DirectEditableCellProps) {  // ← Only position props!
  
  // Get everything from context
  const { 
    getCellValue,
    updateCell,
    getCellMetadata,
    isEditing,
    startEditing,
    stopEditing,
  } = useDataGridContext();
  
  // Get cell-specific data
  const cellData = getCellMetadata(rowIndex, columnIndex);
  const cellValue = getCellValue(cellData.rowId, cellData.columnId);
  
  // Simple editing state (only for input control)
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isCurrentlyEditing = isEditing(rowIndex, columnIndex);
  
  // Auto-focus when editing starts
  useEffect(() => {
    if (isCurrentlyEditing && inputRef.current) {
      inputRef.current.focus();
      setEditValue(String(cellValue ?? ""));  // Initialize from context
    }
  }, [isCurrentlyEditing, cellValue]);
  
  // Simple save - just call context
  const handleSave = () => {
    let finalValue: string | number | null = editValue;
    
    // Validation
    if (cellData.columnType === "NUMBER") {
      const numValue = parseFloat(editValue);
      finalValue = editValue === "" ? null : 
                   isNaN(numValue) ? cellValue :  // Revert on invalid
                   numValue;
    } else {
      finalValue = editValue === "" ? null : editValue;
    }
    
    // Update through context (handles optimistic updates internally)
    if (finalValue !== cellValue) {
      updateCell(cellData.rowId, cellData.columnId, finalValue);
    }
    
    stopEditing();
  };
  
  // Simple cancel
  const handleCancel = () => {
    stopEditing();
  };
  
  // Render logic (simplified)
  const highlightClass = getCellHighlightClass(
    cellValue,
    cellData.columnId,
    // Highlight config comes from context too!
  );
  
  return (
    <div className={highlightClass}>
      {isCurrentlyEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
        />
      ) : (
        <div onClick={() => startEditing(rowIndex, columnIndex)}>
          {cellValue ?? ""}
        </div>
      )}
    </div>
  );
}
```

**Benefits**:
- ✅ Only 1 piece of local state (editValue for input control)
- ✅ 1 useEffect (just for focus)
- ✅ No manual optimistic updates (context handles it)
- ✅ No error handling needed (context handles it)
- ✅ Only 2 props (just position!)
- ✅ ~200 lines instead of 412 (51% reduction)

---

## Example 2: DataGrid - Context Creation

### NEW FILE: useDataGridContext.tsx

```tsx
// hooks/useDataGridContext.tsx

interface DataGridContextValue {
  // Identifiers
  tableId: string;
  viewId: string;
  
  // Data
  getCellValue: (rowId: string, columnId: string) => string | number | null;
  getCellMetadata: (rowIndex: number, columnIndex: number) => CellMetadata;
  rowsByIndex: Map<number, RowData>;
  totalCount: number;
  
  // View Configuration
  filters: Filter[];
  sorts: Sort[];
  searchTerm?: string;
  hiddenFields: string[];
  
  // Selection
  selectedCell: CellPosition | null;
  editingCell: CellPosition | null;
  isEditing: (rowIndex: number, columnIndex: number) => boolean;
  startEditing: (rowIndex: number, columnIndex: number) => void;
  stopEditing: () => void;
  
  // Operations
  updateCell: (rowId: string, columnId: string, value: any) => void;
  clearRows: (rowIds: string[]) => void;
  addOptimisticRow: (row: RowData) => void;
  invalidate: () => void;
}

const DataGridContext = createContext<DataGridContextValue | null>(null);

export function DataGridProvider({ 
  children,
  tableId,
  viewId,
}: DataGridProviderProps) {
  // Get data from hooks
  const { filters, sorts, searchTerm, hiddenFields } = useViewConfig();
  const { rowsByIndex, totalCount, addOptimisticRow, invalidate } = useWindowedRows({
    tableId,
    viewId,
    filters,
    sorts,
    search: searchTerm,
  });
  
  // Selection state (consolidated from SelectionProvider)
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  
  // Column metadata (memoized)
  const { data: table } = api.table.getById.useQuery({ id: tableId });
  const columnMetadata = useMemo(() => {
    return new Map(table?.columns.map(col => [col.id, col]) ?? []);
  }, [table?.columns]);
  
  // Cell metadata getter
  const getCellMetadata = useCallback((rowIndex: number, columnIndex: number) => {
    const row = rowsByIndex.get(rowIndex);
    const columns = Array.from(columnMetadata.values());
    const column = columns[columnIndex - 1]; // -1 for row number column
    
    return {
      rowId: row?.id ?? "",
      columnId: column?.id ?? "",
      columnType: column?.type ?? "TEXT",
    };
  }, [rowsByIndex, columnMetadata]);
  
  // Cell value getter
  const getCellValue = useCallback((rowId: string, columnId: string) => {
    // Find row by ID
    for (const row of rowsByIndex.values()) {
      if (row.id === rowId) {
        return row.data[columnId] ?? null;
      }
    }
    return null;
  }, [rowsByIndex]);
  
  // Update cell mutation (shared by all cells)
  const updateCellMutation = api.row.updateCell.useMutation({
    onMutate: async (variables) => {
      // Optimistic update: Update rowsByIndex directly
      // This is simpler than updating each cell's local state
      // ... implementation
    },
    onSuccess: () => {
      invalidate();
    },
  });
  
  const updateCell = useCallback((rowId: string, columnId: string, value: any) => {
    updateCellMutation.mutate({ rowId, columnId, value });
  }, [updateCellMutation]);
  
  // Clear rows (simplified)
  const clearRowsMutation = api.row.clearRowValues.useMutation({
    onSuccess: () => {
      invalidate();
    },
  });
  
  const clearRows = useCallback((rowIds: string[]) => {
    clearRowsMutation.mutate({ ids: rowIds });
  }, [clearRowsMutation]);
  
  // Editing helpers
  const isEditing = useCallback((rowIndex: number, columnIndex: number) => {
    return editingCell?.rowIndex === rowIndex && 
           editingCell?.columnIndex === columnIndex;
  }, [editingCell]);
  
  const startEditing = useCallback((rowIndex: number, columnIndex: number) => {
    setEditingCell({ rowIndex, columnIndex });
    setSelectedCell({ rowIndex, columnIndex });
  }, []);
  
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);
  
  const value = useMemo(() => ({
    tableId,
    viewId,
    getCellValue,
    getCellMetadata,
    rowsByIndex,
    totalCount,
    filters,
    sorts,
    searchTerm,
    hiddenFields,
    selectedCell,
    editingCell,
    isEditing,
    startEditing,
    stopEditing,
    updateCell,
    clearRows,
    addOptimisticRow,
    invalidate,
  }), [
    tableId, viewId, getCellValue, getCellMetadata, rowsByIndex, totalCount,
    filters, sorts, searchTerm, hiddenFields, selectedCell, editingCell,
    isEditing, startEditing, stopEditing, updateCell, clearRows,
    addOptimisticRow, invalidate,
  ]);
  
  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  );
}

export function useDataGridContext() {
  const context = useContext(DataGridContext);
  if (!context) {
    throw new Error("useDataGridContext must be used within DataGridProvider");
  }
  return context;
}
```

---

## Example 3: DataGrid Component - Simplified

### BEFORE (Current)

```tsx
// DataGrid.tsx - Current (570 lines)

export function DataGrid({ tableId, viewId }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { contextMenuState, /* ... */ } = useContextMenu();
  const { selectedRowIds, editingCell, clearSelection } = useSelection();
  const { search, filters, sorts, hiddenFields, /* ... */ } = useViewConfig();
  
  // Fetch table
  const { data: table, isLoading: tableLoading } = api.table.getById.useQuery(
    { id: tableId }
  );
  
  // Clear rows mutation with complex optimistic state
  const [clearingRowIds, setClearingRowIds] = useState<Set<string>>(new Set());
  const allClearedRowIdsRef = useRef<Set<string>>(new Set());
  const clearRowValuesMutation = api.row.clearRowValues.useMutation({
    onMutate: async ({ ids }) => {
      ids.forEach((id) => allClearedRowIdsRef.current.add(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
    },
    // ... 50 more lines
  });
  
  // Keyboard handler (60 lines)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace logic
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowIds, editingCell, clearSelection]);
  
  // Fetch rows (complex)
  const completeFilters = useMemo(() => {
    return filters.filter(/* ... */);
  }, [filters]);
  
  const { rowsByIndex, totalCount, /* ... */ } = useWindowedRows(
    { tableId, viewId, filters: completeFilters, sorts, search },
    tableContainerRef,
  );
  
  // Optimistic updates (40 lines)
  const rows = useMemo(() => { /* ... */ }, [rowsByIndex, clearingRowIds]);
  const optimisticRowsByIndex = useMemo(() => { /* ... */ }, [rowsByIndex, clearingRowIds]);
  
  // Search match counting (30 lines)
  useEffect(() => {
    if (!search || !table?.columns) return;
    let matchCount = 0;
    // Count matches...
    setSearchMatchCount(matchCount);
  }, [search, rowsByIndex, table?.columns, hiddenFields]);
  
  // Scroll position save/restore (50 lines)
  useEffect(() => {
    // Restore scroll
  }, [viewId, rowsByIndex.size]);
  
  useEffect(() => {
    // Save scroll
  }, [viewId]);
  
  // Virtual scrolling setup (60 lines)
  const columns = useTableColumns(table?.columns, hiddenFields);
  const tableInstance = useReactTable({ /* ... */ });
  const rowVirtualizer = useVirtualizer({ /* ... */ });
  
  // ... 200 more lines
  
  return (
    <WindowedRowsProvider value={{ /* ... */ }}>
      <div ref={tableContainerRef}>
        <DataGridTable
          table={tableInstance}
          tableId={tableId}
          viewId={viewId}
          virtualRows={virtualRows}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
          columnCount={columns.length}
          tableWidth={tableWidth}
          rowsByIndex={optimisticRowsByIndex}
          totalCount={totalCount}
          filters={highlightFilters}
          sorts={highlightSorts}
          searchTerm={highlightSearch}
        />
      </div>
    </WindowedRowsProvider>
  );
}
```

---

### AFTER (Refactored)

```tsx
// DataGrid.tsx - Refactored (250 lines)

export function DataGrid({ tableId, viewId }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // All data/state comes from context - no local state needed!
  const { 
    rowsByIndex,
    totalCount,
    columns,
  } = useDataGridContext();
  
  // Extracted hooks handle specific concerns
  useDataGridKeyboard();           // Handles Delete/Backspace
  useScrollPosition(viewId, tableContainerRef);  // Handles scroll save/restore
  useSearchMatchCount();           // Handles search counting
  
  // Virtual scrolling setup (simplified - just for rendering)
  const rowVirtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
  });
  
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = totalCount * ROW_HEIGHT - (virtualRows[virtualRows.length - 1]?.end ?? 0);
  
  // Loading states
  if (!rowsByIndex.size) {
    return <LoadingState />;
  }
  
  return (
    <div ref={tableContainerRef} className="h-full overflow-auto">
      <DataGridTable
        virtualRows={virtualRows}
        paddingTop={paddingTop}
        paddingBottom={paddingBottom}
      />
      
      {totalCount === 0 && <EmptyState />}
      
      <ContextMenus />  {/* Handles both cell and column menus */}
      <RecordCounter />  {/* Shows "X records" */}
    </div>
  );
}
```

**Benefits**:
- ✅ No local state management
- ✅ No complex mutations
- ✅ No manual optimistic updates
- ✅ Clear separation of concerns
- ✅ Only 3 props passed to DataGridTable (was 13!)
- ✅ ~250 lines instead of 570 (56% reduction)

---

## Example 4: Extracted Hook - Keyboard Shortcuts

### NEW FILE: useDataGridKeyboard.tsx

```tsx
// hooks/useDataGridKeyboard.tsx

export function useDataGridKeyboard() {
  const { selectedRowIds, editingCell, clearRows, clearSelection } = useDataGridContext();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if editing or no selection
      if (editingCell || selectedRowIds.size === 0) return;
      
      // Skip if in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      
      // Handle Delete/Backspace
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        
        // Clear via context (handles everything!)
        clearRows(Array.from(selectedRowIds));
        clearSelection();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowIds, editingCell, clearRows, clearSelection]);
}
```

**Benefits**:
- ✅ Isolated feature - easy to test
- ✅ Easy to disable (just don't call the hook)
- ✅ Clear responsibility
- ✅ Reusable across different grids

---

## Migration Path

### Step 1: Create Context (No Breaking Changes)

```tsx
// Create new context, but don't use it yet
// DataGrid still works with old approach
// This allows testing in parallel

<DataGridProvider tableId={tableId} viewId={viewId}>
  <OldDataGridImpl />  {/* Still works! */}
</DataGridProvider>
```

### Step 2: Migrate One Cell at a Time

```tsx
// Feature flag to test new cell implementation
const USE_NEW_CELL = process.env.NEXT_PUBLIC_USE_NEW_CELL === 'true';

{USE_NEW_CELL ? (
  <NewDirectEditableCell rowIndex={i} columnIndex={j} />
) : (
  <DirectEditableCell {...allTheProps} />
)}
```

### Step 3: Migrate Parent Components

```tsx
// Once cells work, simplify parent
<DataGridTable
  {...onlyRenderingProps}  // Old props still passed but ignored
/>
```

### Step 4: Clean Up

```tsx
// Remove old props, old state, old logic
// This is the safest step because everything already works
```

---

## Testing Strategy

### Before Each Change

```tsx
// Snapshot current behavior
describe("DataGrid - Before Refactor", () => {
  it("handles cell editing", () => {
    // Test current implementation
  });
  
  it("handles keyboard shortcuts", () => {
    // Test current implementation
  });
  
  // ... more tests
});
```

### After Each Change

```tsx
// Verify behavior is identical
describe("DataGrid - After Refactor", () => {
  it("handles cell editing", () => {
    // Should pass with EXACT same assertions
  });
  
  it("handles keyboard shortcuts", () => {
    // Should pass with EXACT same assertions
  });
});
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Rollback is easy because we changed incrementally
git revert <commit-hash>

# Or use feature flags
NEXT_PUBLIC_USE_NEW_CELL=false npm run dev
```

---

## Summary

### What Changes
- ❌ **Remove**: Prop drilling (25+ props → 5 props)
- ❌ **Remove**: Local state in cells (5 pieces → 1 piece)
- ❌ **Remove**: Manual sync effects (2 → 0)
- ❌ **Remove**: Complex optimistic updates
- ✅ **Add**: DataGridContext (single source of truth)
- ✅ **Add**: Extracted hooks (keyboard, scroll, search)
- ✅ **Add**: Cleaner component boundaries

### What Stays The Same
- ✅ All functionality (cell editing, keyboard shortcuts, etc.)
- ✅ Performance (actually better due to less re-renders)
- ✅ User experience (identical)
- ✅ API/server communication (unchanged)

### Risk Level
**LOW** - Because we:
- Change incrementally
- Test at each step
- Can rollback easily
- Don't change functionality

---

Ready to start implementing? Let's begin with creating the DataGridContext! 🚀

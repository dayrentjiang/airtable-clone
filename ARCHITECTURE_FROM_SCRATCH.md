# Building DataGrid Architecture from Scratch
## A Modern, Scalable Approach

> **Date**: February 3, 2026  
> **Purpose**: Complete architectural redesign based on lessons learned

---

## 🎯 Core Principles

### 1. **Single Source of Truth**
- Context holds canonical state
- Components read from context, never pass data via props
- No duplicate state in children

### 2. **Separation of Concerns**
- **Data Layer**: Fetching, caching, mutations
- **State Layer**: Selection, editing, UI state
- **View Layer**: Rendering components
- **Logic Layer**: Business logic hooks

### 3. **Progressive Enhancement**
- Start with basic features
- Add complexity only when needed
- Keep escape hatches for edge cases

### 4. **Performance by Default**
- Memoization at context level
- Virtual scrolling built-in
- Optimistic updates with proper rollback

---

## 📁 Proposed Directory Structure

```
src/app/_components/base/DataGrid/
│
├── index.tsx                    # Public API exports
│
├── DataGrid.tsx                 # Root component (thin wrapper)
│
├── core/                        # Core state management
│   ├── DataGridContext.tsx      # Main context (combines all)
│   ├── types.ts                 # Core types
│   └── constants.ts             # Magic numbers
│
├── state/                       # State management hooks
│   ├── useDataState.ts          # Data fetching/caching
│   ├── useSelectionState.ts     # Selection logic
│   ├── useEditingState.ts       # Editing logic
│   ├── useContextMenuState.ts   # Context menu
│   └── useViewState.ts          # Filters/sorts/search
│
├── hooks/                       # Business logic hooks
│   ├── useDataGridKeyboard.ts   # Keyboard shortcuts
│   ├── useScrollPosition.ts     # Scroll persistence
│   ├── useVirtualization.ts     # Virtual scrolling
│   ├── useCellOperations.ts     # Cell CRUD
│   └── useColumnOperations.ts   # Column CRUD
│
├── components/                  # UI components
│   ├── DataGridTable.tsx        # Table wrapper
│   ├── DataGridHeader.tsx       # Column headers
│   ├── DataGridRow.tsx          # Row component
│   ├── DataGridCell.tsx         # Cell component (pure)
│   └── AddColumnButton.tsx      # Add column UI
│
├── menus/                       # Context menus
│   ├── CellContextMenu.tsx
│   └── ColumnContextMenu.tsx
│
└── utils/                       # Utilities
    ├── cellFormatters.ts        # Display formatting
    ├── validators.ts            # Input validation
    └── helpers.ts               # Pure functions
```

---

## 🏗️ Architecture Layers

### Layer 1: Core Context (Single Source of Truth)

```tsx
// core/DataGridContext.tsx

interface DataGridContextValue {
  // ===== DATA LAYER =====
  tableId: string;
  viewId: string;
  columns: Column[];
  rowsByIndex: Map<number, Row>;
  totalCount: number;
  isLoading: boolean;
  
  // ===== SELECTION STATE =====
  selectedCell: CellPosition | null;
  selectedRows: Set<string>;
  selectedColumns: Set<number>;
  
  // ===== EDITING STATE =====
  editingCell: CellPosition | null;
  
  // ===== VIEW STATE =====
  filters: Filter[];
  sorts: Sort[];
  search: string;
  hiddenColumns: Set<string>;
  
  // ===== COMPUTED VALUES =====
  getCellValue: (rowId: string, columnId: string) => CellValue;
  getCellMetadata: (rowIndex: number, columnIndex: number) => CellMetadata;
  isCellSelected: (rowIndex: number, columnIndex: number) => boolean;
  isCellEditing: (rowIndex: number, columnIndex: number) => boolean;
  
  // ===== OPERATIONS =====
  selectCell: (position: CellPosition) => void;
  startEditing: (position: CellPosition) => void;
  stopEditing: () => void;
  updateCell: (rowId: string, columnId: string, value: CellValue) => Promise<void>;
  deleteRows: (rowIds: string[]) => Promise<void>;
  addColumn: (name: string, type: ColumnType) => Promise<void>;
  
  // ===== VIRTUALIZATION =====
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  containerRef: RefObject<HTMLDivElement>;
}

export function DataGridProvider({ children, tableId, viewId }) {
  // Compose state from focused hooks
  const dataState = useDataState(tableId, viewId);
  const selectionState = useSelectionState();
  const editingState = useEditingState();
  const viewState = useViewState(viewId);
  const virtualization = useVirtualization(containerRef);
  
  // Compose operations
  const operations = useMemo(() => ({
    ...useCellOperations(dataState, editingState),
    ...useColumnOperations(dataState),
    // ... other operations
  }), [dataState, editingState]);
  
  const value = useMemo(() => ({
    ...dataState,
    ...selectionState,
    ...editingState,
    ...viewState,
    ...virtualization,
    ...operations,
  }), [dataState, selectionState, editingState, viewState, virtualization, operations]);
  
  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  );
}
```

**Why This Works:**
- ✅ Single context, but composed from focused hooks
- ✅ Each hook manages one concern
- ✅ Easy to test each piece independently
- ✅ Context only re-renders when needed (memoization)

---

### Layer 2: State Management Hooks (Focused Concerns)

#### 2.1 Data State Hook

```tsx
// state/useDataState.ts

export function useDataState(tableId: string, viewId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch table metadata
  const { data: table } = api.table.getById.useQuery({ id: tableId });
  
  // Window-based data fetching
  const {
    rowsByIndex,
    totalCount,
    isLoading,
    invalidate,
  } = useWindowedRows({
    tableId,
    viewId,
    containerRef,
  });
  
  // Computed getters
  const getCellValue = useCallback((rowId: string, columnId: string) => {
    const row = Array.from(rowsByIndex.values()).find(r => r.id === rowId);
    return row?.data[columnId] ?? null;
  }, [rowsByIndex]);
  
  const getCellMetadata = useCallback((rowIndex: number, columnIndex: number) => {
    const row = rowsByIndex.get(rowIndex);
    const column = table?.columns[columnIndex - 1]; // -1 for row number column
    
    return {
      rowId: row?.id ?? '',
      columnId: column?.id ?? '',
      columnType: column?.type ?? 'TEXT',
      columnName: column?.name ?? '',
    };
  }, [rowsByIndex, table]);
  
  return {
    tableId,
    viewId,
    columns: table?.columns ?? [],
    rowsByIndex,
    totalCount,
    isLoading,
    getCellValue,
    getCellMetadata,
    invalidate,
    containerRef,
  };
}
```

**Key Points:**
- Pure data management
- No UI concerns
- Memoized getters for performance
- Returns ref for virtualization

---

#### 2.2 Selection State Hook

```tsx
// state/useSelectionState.ts

export function useSelectionState() {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  
  const selectCell = useCallback((position: CellPosition | null) => {
    setSelectedCell(position);
    // Clear other selections
    setSelectedRows(new Set());
    setSelectedColumns(new Set());
  }, []);
  
  const toggleRowSelection = useCallback((rowId: string, isMulti = false) => {
    setSelectedRows(prev => {
      const next = isMulti ? new Set(prev) : new Set();
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
    // Clear cell selection
    setSelectedCell(null);
  }, []);
  
  const isCellSelected = useCallback((rowIndex: number, columnIndex: number) => {
    return selectedCell?.rowIndex === rowIndex && 
           selectedCell?.columnIndex === columnIndex;
  }, [selectedCell]);
  
  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectedRows(new Set());
    setSelectedColumns(new Set());
  }, []);
  
  return {
    selectedCell,
    selectedRows,
    selectedColumns,
    selectCell,
    toggleRowSelection,
    isCellSelected,
    clearSelection,
  };
}
```

**Key Points:**
- Focused only on selection
- All selection logic in one place
- Easy to test independently
- No data fetching concerns

---

#### 2.3 Editing State Hook

```tsx
// state/useEditingState.ts

export function useEditingState() {
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  
  const startEditing = useCallback((position: CellPosition) => {
    setEditingCell(position);
  }, []);
  
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);
  
  const isCellEditing = useCallback((rowIndex: number, columnIndex: number) => {
    return editingCell?.rowIndex === rowIndex && 
           editingCell?.columnIndex === columnIndex;
  }, [editingCell]);
  
  return {
    editingCell,
    startEditing,
    stopEditing,
    isCellEditing,
  };
}
```

**Key Points:**
- Minimal state
- Clear responsibility
- No side effects

---

### Layer 3: Operations Hooks (Business Logic)

#### 3.1 Cell Operations

```tsx
// hooks/useCellOperations.ts

export function useCellOperations(
  dataState: DataState,
  editingState: EditingState
) {
  const utils = api.useUtils();
  
  // Single mutation with built-in optimistic updates
  const updateMutation = api.row.updateCell.useMutation({
    onMutate: async ({ rowId, columnId, value }) => {
      await utils.row.infiniteWithView.cancel();
      
      // Optimistic update in cache
      utils.row.infiniteWithView.setData(
        { tableId: dataState.tableId, viewId: dataState.viewId },
        (old) => updateCellInCache(old, rowId, columnId, value)
      );
    },
    onError: () => {
      // Rollback
      void utils.row.infiniteWithView.invalidate();
      dataState.invalidate();
    },
  });
  
  const updateCell = useCallback(async (
    rowId: string,
    columnId: string,
    value: CellValue
  ) => {
    // Validation
    const metadata = dataState.getCellMetadata(/* ... */);
    const validatedValue = validateCellValue(value, metadata.columnType);
    
    if (validatedValue === null && value !== null) {
      throw new Error('Invalid value');
    }
    
    // Update
    await updateMutation.mutateAsync({ rowId, columnId, value: validatedValue });
    
    // Auto-stop editing
    editingState.stopEditing();
  }, [dataState, editingState, updateMutation]);
  
  return {
    updateCell,
    isUpdating: updateMutation.isPending,
  };
}
```

**Key Points:**
- Business logic separated from state
- Validation built-in
- Optimistic updates handled automatically
- Composable with other operations

---

### Layer 4: View Components (Pure Presentation)

#### 4.1 Cell Component (The Simplest)

```tsx
// components/DataGridCell.tsx

interface CellProps {
  rowIndex: number;
  columnIndex: number;
}

export function DataGridCell({ rowIndex, columnIndex }: CellProps) {
  const {
    getCellValue,
    getCellMetadata,
    isCellSelected,
    isCellEditing,
    selectCell,
    startEditing,
    updateCell,
  } = useDataGridContext();
  
  // Get data
  const metadata = getCellMetadata(rowIndex, columnIndex);
  const value = getCellValue(metadata.rowId, metadata.columnId);
  
  // Get state
  const isSelected = isCellSelected(rowIndex, columnIndex);
  const isEditing = isCellEditing(rowIndex, columnIndex);
  
  // Local editing state (UI only)
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Effects
  useEffect(() => {
    if (isEditing) {
      setEditValue(String(value ?? ''));
      inputRef.current?.focus();
    }
  }, [isEditing, value]);
  
  // Handlers
  const handleClick = () => {
    selectCell({ rowIndex, columnIndex });
  };
  
  const handleDoubleClick = () => {
    startEditing({ rowIndex, columnIndex });
  };
  
  const handleSave = async () => {
    await updateCell(metadata.rowId, metadata.columnId, editValue);
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleSave();
    } else if (e.key === 'Escape') {
      stopEditing();
    }
  };
  
  // Render
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="cell-input"
      />
    );
  }
  
  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn('cell', isSelected && 'selected')}
    >
      {formatCellValue(value, metadata.columnType)}
    </div>
  );
}
```

**Key Points:**
- ✅ Only 2 props (position)
- ✅ All data from context
- ✅ Minimal local state (just input value)
- ✅ No sync effects
- ✅ Clear separation: data vs UI state
- ✅ Easy to read and maintain

---

## 🎨 Component Hierarchy

```
DataGridProvider (context)
  └── DataGrid (thin wrapper)
       ├── KeyboardHandler (logic hook)
       ├── ScrollPosition (logic hook)
       └── DataGridTable
            ├── DataGridHeader
            │    └── ColumnHeader × N
            │         └── ColumnContextMenu
            └── VirtualRows
                 └── DataGridRow × N
                      └── DataGridCell × M
                           └── CellContextMenu
```

**Data Flow:**
1. Provider manages all state
2. Components read from context
3. Components trigger operations via context
4. Operations update context state
5. Components re-render automatically

---

## 🚀 Implementation Strategy

### Phase 1: Foundation (Week 1)
1. Create context structure
2. Implement state hooks (useDataState, useSelectionState, etc.)
3. Write unit tests for each hook
4. No UI changes yet

### Phase 2: Operations (Week 2)
1. Implement operation hooks (useCellOperations, etc.)
2. Add mutation handling
3. Add optimistic updates
4. Test thoroughly

### Phase 3: Components (Week 3)
1. Create new Cell component using context
2. Create new Row component
3. Create new Table component
4. Run in parallel with old code (feature flag)

### Phase 4: Migration (Week 4)
1. Switch to new components
2. Remove old code
3. Performance testing
4. Bug fixes

### Phase 5: Polish (Week 5)
1. Add advanced features (copy/paste, drag/drop)
2. Performance optimizations
3. Documentation
4. Celebrate! 🎉

---

## 🔑 Key Improvements Over Current

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Cell Props** | 11 props | 2 props |
| **State Duplication** | 5 copies | 1 source |
| **Sync Effects** | 3 per cell | 0 |
| **Context Providers** | 3 separate | 1 composed |
| **Code Lines (Cell)** | ~400 lines | ~100 lines |
| **Testing** | Hard to test | Easy to test |
| **Performance** | Manual optimization | Built-in |
| **Maintainability** | Complex | Simple |

---

## 📊 Performance Considerations

### 1. Context Re-renders
**Problem**: Context change re-renders all consumers

**Solution**:
```tsx
// Split context if needed
const DataGridStateContext = createContext(/*...*/);
const DataGridOperationsContext = createContext(/*...*/);

// Operations never change (memoized)
// Only state changes trigger re-renders
```

### 2. Virtualization
**Built-in from the start**:
- TanStack Virtual for rows
- Only render visible cells
- Windowed data fetching
- Scroll position persistence

### 3. Memoization Strategy
```tsx
// Context level
const value = useMemo(() => ({
  ...dataState,
  ...operations,
}), [dataState, operations]);

// Component level
const Cell = memo(DataGridCell, (prev, next) => {
  return prev.rowIndex === next.rowIndex &&
         prev.columnIndex === next.columnIndex;
});
```

---

## 🧪 Testing Strategy

### Unit Tests
```tsx
describe('useSelectionState', () => {
  it('selects cell and clears other selections', () => {
    const { result } = renderHook(() => useSelectionState());
    
    act(() => {
      result.current.selectCell({ rowIndex: 0, columnIndex: 1 });
    });
    
    expect(result.current.selectedCell).toEqual({ rowIndex: 0, columnIndex: 1 });
    expect(result.current.selectedRows.size).toBe(0);
  });
});
```

### Integration Tests
```tsx
describe('DataGridCell', () => {
  it('updates cell value on edit', async () => {
    const { getByRole } = render(
      <DataGridProvider tableId="t1" viewId="v1">
        <DataGridCell rowIndex={0} columnIndex={1} />
      </DataGridProvider>
    );
    
    // Double click to edit
    const cell = getByRole('cell');
    fireEvent.doubleClick(cell);
    
    // Type new value
    const input = getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.blur(input);
    
    // Check mutation was called
    await waitFor(() => {
      expect(mockUpdateCell).toHaveBeenCalledWith({
        rowId: 'r1',
        columnId: 'c1',
        value: 'New Value',
      });
    });
  });
});
```

---

## 🎯 Success Metrics

After refactoring, you should see:

1. **Code Reduction**: 60% fewer lines in cell components
2. **Performance**: 50% faster renders (no sync effects)
3. **Maintainability**: New features take 1/3 the time
4. **Testing**: 100% test coverage on business logic
5. **Bugs**: 80% fewer state-related bugs
6. **Onboarding**: New devs productive in 1 day vs 1 week

---

## 💡 Best Practices

### DO ✅
- Keep context focused but comprehensive
- Compose state from multiple hooks
- Memoize everything at context level
- Test hooks in isolation
- Keep components pure and simple
- Use TypeScript strictly
- Document complex logic

### DON'T ❌
- Pass data via props when context exists
- Duplicate state in children
- Use sync effects to keep state aligned
- Create separate providers for related state
- Mix UI state with data state
- Optimize prematurely
- Skip unit tests

---

## 🔮 Future Enhancements

Once the foundation is solid:

1. **Advanced Features**
   - Multi-cell selection
   - Copy/paste
   - Undo/redo
   - Cell comments
   - Rich text editing

2. **Performance**
   - Web Workers for data processing
   - Service Worker for offline support
   - IndexedDB for local caching
   - Streaming data updates

3. **Developer Experience**
   - Storybook for components
   - Playwright for E2E tests
   - Performance monitoring
   - Error boundaries

---

## 📚 Resources

- [TanStack Table Docs](https://tanstack.com/table/latest)
- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/guides/optimistic-updates)

---

## ✨ Conclusion

This architecture provides:

- **Simplicity**: Easy to understand and modify
- **Scalability**: Can handle millions of rows
- **Maintainability**: Clear separation of concerns
- **Performance**: Built-in optimizations
- **Testability**: Each piece can be tested independently
- **Flexibility**: Easy to add features

The key insight: **Keep state in context, keep components dumb, keep logic in hooks.**

Start with the foundation, build incrementally, test thoroughly, and you'll have a world-class data grid that's a joy to work with! 🚀

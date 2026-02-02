# DataGrid Architecture Diagrams

## Current State: Prop Drilling Problem

```
BaseContent
    │
    ├─→ ViewConfigProvider (filters, sorts, search)
    │       │
    │       └─→ SelectionProvider (selection state)
    │               │
    │               └─→ ContextMenuProvider (menus)
    │                       │
    │                       └─→ DataGrid
    │                               │
    │                               ├─ Props: tableId, viewId
    │                               ├─ useViewConfig() → filters, sorts, search, hiddenFields
    │                               ├─ useSelection() → selectedRowIds, editingCell, etc.
    │                               ├─ useWindowedRows() → rowsByIndex, totalCount
    │                               │
    │                               └─→ DataGridTable
    │                                       │
    │                                       ├─ Props: table, tableId, viewId, 
    │                                       │         virtualRows, paddingTop, paddingBottom,
    │                                       │         columnCount, tableWidth, rowsByIndex,
    │                                       │         totalCount, filters, sorts, searchTerm
    │                                       │         (13 props! 😱)
    │                                       │
    │                                       ├─→ DataGridHeader
    │                                       │       └─ Props: headerGroups, tableId, filters, sorts
    │                                       │
    │                                       └─→ DirectEditableCell (for each cell)
    │                                               │
    │                                               ├─ Props: rowIndex, rowId, tableId,
    │                                               │         columnId, columnIndex, columnType,
    │                                               │         value, searchTerm, filters, sorts
    │                                               │         (11 props! 😱)
    │                                               │
    │                                               ├─ Local State: value, displayValue,
    │                                               │               validationError, previousValueRef
    │                                               │
    │                                               ├─ useSelection() → isSelected, isEditing, etc.
    │                                               ├─ useContextMenu() → showContextMenu
    │                                               └─ useMutation() → updateCell
```

## Problem Visualization

### Issue #1: Data Flow is Spaghetti
```
┌─────────────────────────────────────────────────────────┐
│                    DataGrid Component                    │
│                                                          │
│  filters ──┐                                             │
│  sorts ────┼──→ Passed as props ──→ DataGridTable       │
│  search ───┘                              │              │
│                                           ↓              │
│                                    DirectEditableCell    │
│                                           │              │
│                                           ↓              │
│                                    Only used for         │
│                                    highlighting! 🤦      │
└─────────────────────────────────────────────────────────┘

Better: Put highlight config in context, cells read directly
```

### Issue #2: State Synchronization Nightmare
```
Row Data has FOUR representations:

1. rowsByIndex (Map)              ← From useWindowedRows
       ↓
2. rows (Array)                   ← Converted in DataGrid
       ↓
3. optimisticRowsByIndex (Map)    ← With clearing overlay
       ↓
4. displayValue in each cell      ← Local state in DirectEditableCell

Problem: Any of these can get out of sync! 😱
```

### Issue #3: Clearing Rows Has Too Many Steps
```
User clicks "Clear Rows"
    │
    ├─→ clearRowValuesMutation.mutate()
    │       │
    │       ├─→ onMutate: Add to allClearedRowIdsRef (RefObject)
    │       │              Add to clearingRowIds (State)
    │       │              Cancel queries
    │       │
    │       ├─→ Server request
    │       │
    │       ├─→ onSuccess: Invalidate queries
    │       │
    │       └─→ onSettled: Invalidate again
    │
    ├─→ useEffect watches clearingRowIds
    │       │
    │       ├─→ Check if rows are "confirmed cleared"
    │       ├─→ Compare data to detect empty
    │       └─→ Remove from allClearedRowIdsRef
    │
    └─→ useMemo creates optimisticRowsByIndex
            │
            └─→ Shows empty data for clearing rows

Total: ~150 lines for one feature! 🤯
```

---

## Proposed State: Clean Architecture

```
BaseContent
    │
    └─→ DataGridProvider (ALL context in one place)
            │
            ├─ State: tableId, viewId, rowsByIndex, totalCount
            ├─ Config: filters, sorts, search, hiddenFields
            ├─ Selection: selectedCells, selectedRows, editingCell
            ├─ Operations: updateCell, clearRows, invalidate
            │
            └─→ DataGrid (presentation only)
                    │
                    ├─ useDataGridContext() → Gets everything needed
                    ├─ useKeyboardShortcuts() → Extracted hook
                    ├─ useScrollPosition() → Extracted hook
                    │
                    └─→ DataGridTable
                            │
                            ├─ Props: virtualRows, paddingTop, paddingBottom
                            │         (Only rendering props! ✅)
                            │
                            ├─→ DataGridHeader
                            │       └─ useDataGridContext() → Gets filters, sorts
                            │
                            └─→ DirectEditableCell
                                    │
                                    ├─ Props: rowIndex, columnIndex
                                    │         (Just position! ✅)
                                    │
                                    ├─ useDataGridContext() → Gets everything else
                                    └─ No local state! ✅
```

## Comparison: Before vs After

### Data Access Pattern

**BEFORE (Prop Drilling)**
```
DataGrid
  │
  ├─ Fetches: filters, sorts, search (from context)
  ├─ Fetches: rowsByIndex (from hook)
  │
  └─→ Props: filters, sorts, search, rowsByIndex
      │
      DataGridTable
        │
        └─→ Props: filters, sorts, search, rowsByIndex
            │
            DirectEditableCell
              │
              └─ Uses: filters, sorts (for highlighting)
                 Uses: rowsByIndex (lookup)

Props passed: 25+
Context calls: 3
```

**AFTER (Context-First)**
```
DataGrid
  │
  └─→ Props: virtualRows, padding (rendering only)
      │
      DataGridTable
        │
        └─→ Props: rowIndex, columnIndex (position only)
            │
            DirectEditableCell
              │
              └─ useDataGridContext()
                 ├─ Gets: filters, sorts (for highlighting)
                 ├─ Gets: cellValue (for display)
                 └─ Calls: updateCell (for changes)

Props passed: 5
Context calls: 1 (per component)
```

### State Updates Flow

**BEFORE (Complex)**
```
User types in cell
    │
    ├─→ DirectEditableCell.value (local state)
    ├─→ DirectEditableCell.displayValue (local state)
    │
    ├─→ useEffect syncs with initialValue prop
    ├─→ useEffect syncs with previousValueRef
    │
    └─→ On save: updateCellMutation
            │
            ├─→ onMutate: Set displayValue optimistically
            ├─→ Server update
            ├─→ onSuccess: Invalidate query
            │
            └─→ Query refetch updates rowsByIndex
                    │
                    └─→ Prop change to initialValue
                            │
                            └─→ useEffect syncs local state again!

Problem: 5 state updates for one change! 😱
```

**AFTER (Simple)**
```
User types in cell
    │
    └─→ DirectEditableCell calls context.updateCell()
            │
            ├─→ Context updates internal state (optimistic)
            ├─→ Mutation to server
            ├─→ On success: Query refetch
            │
            └─→ Context state updates
                    │
                    └─→ Cell re-renders with new value

Result: 2 state updates, no sync needed! ✅
```

---

## Impact Visualization

### Code Volume Reduction
```
DataGrid.tsx:         570 lines  ──→  250 lines  (56% ↓)
DirectEditableCell:   412 lines  ──→  200 lines  (51% ↓)
Total Props:           25 props  ──→    5 props  (80% ↓)
State Pieces:         15 pieces  ──→    8 pieces (47% ↓)
Context Providers:    4 providers ──→   2 providers (50% ↓)
```

### Complexity Reduction
```
Before:
┌────────────────────────────────────────┐
│ DataGrid: ████████████████████ (20/20) │ ← MAX COMPLEXITY
│ DirectEditableCell: ████████████ (15/20)│
│ DataGridTable: ████████ (8/20)         │
└────────────────────────────────────────┘

After:
┌────────────────────────────────────────┐
│ DataGrid: ████████ (8/20)             │ ← 60% REDUCTION
│ DirectEditableCell: ████ (4/20)        │
│ DataGridTable: ████ (4/20)            │
└────────────────────────────────────────┘
```

---

## Key Insights

### 1. Context is Cheaper Than Props
```
Passing props through 3 levels:
  Parent → Child → Grandchild
  
  Cost: 3x prop declarations, 3x re-renders
  
Using context:
  Grandchild → Context (direct)
  
  Cost: 1x context call, selective re-renders
```

### 2. Single Source of Truth Eliminates Sync
```
BEFORE: Row data in 4 places → Manual sync → Bugs
AFTER:  Row data in 1 place → No sync → No bugs
```

### 3. Smaller Components Are Easier
```
Big component: Hard to understand, hard to test, easy to break
Small component: Easy to understand, easy to test, hard to break
```

---

## Mental Model

Think of the refactored DataGrid like a **restaurant**:

### Before (Current State)
```
Kitchen (DataGrid)
  │
  └─→ Waiter (DataGridTable)
      ├─ Carries: Menu, specials, prices, chef's notes,
      │          customer preferences, dietary restrictions,
      │          payment methods, reservation info...
      │          (Everything! 😰)
      │
      └─→ Customer Table (DirectEditableCell)
          └─ Waiter tells them EVERYTHING
```

### After (Refactored)
```
Kitchen (DataGrid)
  ↓
Central Database (DataGridContext)
  ↑
Customer Table (DirectEditableCell)
  └─ Asks database: "What's available?"
  └─ Tells database: "I want this."

No waiter needed! Direct communication! ✅
```

---

## Remember

> "Simplicity is the ultimate sophistication." - Leonardo da Vinci

> "Any fool can write code that a computer can understand.  
>  Good programmers write code that humans can understand." - Martin Fowler

> "The best code is no code at all." - Jeff Atwood

Your current code **works perfectly**. But it's **hard to maintain**.  
Refactoring makes it **easy to maintain** without changing what it does.

**KISS = Keep It Simple, Stupid** 🎯

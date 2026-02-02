# DataGrid Refactoring Checklist

This is your step-by-step implementation guide for refactoring the DataGrid component.

---

## 🎯 Phase 1: Foundation (Week 1)

### Task 1.1: Create DataGridContext ⭐ START HERE

**Goal**: Consolidate all state into one context
**Time**: 4-6 hours
**Risk**: LOW

#### Checklist
- [ ] Create `src/app/_components/base/DataGrid/hooks/useDataGridContext.tsx`
- [ ] Define `DataGridContextValue` interface with:
  - [ ] `tableId`, `viewId`
  - [ ] `getCellValue()`, `getCellMetadata()`
  - [ ] `rowsByIndex`, `totalCount`
  - [ ] `filters`, `sorts`, `searchTerm`, `hiddenFields`
  - [ ] Selection state: `selectedCell`, `editingCell`
  - [ ] Operations: `updateCell()`, `clearRows()`, `addOptimisticRow()`, `invalidate()`
- [ ] Implement `DataGridProvider` component
- [ ] Implement `useDataGridContext()` hook
- [ ] Add proper TypeScript types
- [ ] Write unit tests for context

#### Files to Create
- `src/app/_components/base/DataGrid/hooks/useDataGridContext.tsx` (new)

#### Files to Modify
- None yet (context runs in parallel)

---

### Task 1.2: Extract Keyboard Shortcut Hook

**Goal**: Move keyboard logic out of DataGrid
**Time**: 2-3 hours
**Risk**: LOW

#### Checklist
- [ ] Create `src/app/_components/base/DataGrid/hooks/useDataGridKeyboard.tsx`
- [ ] Move keyboard event listener from DataGrid
- [ ] Use `useDataGridContext()` for state access
- [ ] Handle Delete/Backspace for clearing rows
- [ ] Handle Escape for canceling edits
- [ ] Add proper cleanup in useEffect
- [ ] Write unit tests

#### Code to Move
From `DataGrid.tsx` lines 120-158:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Delete/Backspace logic
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [selectedRowIds, editingCell, clearSelection]);
```

#### Files to Create
- `src/app/_components/base/DataGrid/hooks/useDataGridKeyboard.tsx` (new)

#### Files to Modify
- `src/app/_components/base/DataGrid.tsx` (remove keyboard logic, add `useDataGridKeyboard()` call)

---

### Task 1.3: Extract Scroll Position Hook

**Goal**: Separate scroll persistence logic
**Time**: 2-3 hours
**Risk**: LOW

#### Checklist
- [ ] Create `src/app/_components/base/DataGrid/hooks/useScrollPosition.tsx`
- [ ] Move scroll save logic from DataGrid
- [ ] Move scroll restore logic from DataGrid
- [ ] Accept `viewId` and `containerRef` as params
- [ ] Use localStorage for persistence
- [ ] Add debouncing for save (150ms)
- [ ] Write unit tests

#### Code to Move
From `DataGrid.tsx` lines 401-451:
```tsx
// Restore scroll position
useEffect(() => { /* ... */ }, [viewId, rowsByIndex.size]);

// Save scroll position
useEffect(() => { /* ... */ }, [viewId]);
```

#### Files to Create
- `src/app/_components/base/DataGrid/hooks/useScrollPosition.tsx` (new)

#### Files to Modify
- `src/app/_components/base/DataGrid.tsx` (remove scroll logic, add `useScrollPosition()` call)

---

### Task 1.4: Wire Up Context in DataGrid

**Goal**: Use context in DataGrid without breaking cells yet
**Time**: 2-3 hours
**Risk**: LOW

#### Checklist
- [ ] Wrap DataGrid with `DataGridProvider` in parent component
- [ ] Call `useDataGridContext()` in DataGrid
- [ ] Keep passing props to DataGridTable (backward compatible)
- [ ] Verify existing functionality still works
- [ ] Test all features manually
- [ ] Add console.log to verify context values

#### Files to Modify
- `src/app/_components/base/BaseContent.tsx` (wrap DataGrid with provider)
- `src/app/_components/base/DataGrid.tsx` (call useDataGridContext, keep existing code)

---

## 🔧 Phase 2: Cell Simplification (Week 2)

### Task 2.1: Create New DirectEditableCell (v2)

**Goal**: Build new cell implementation using context
**Time**: 6-8 hours
**Risk**: MEDIUM

#### Checklist
- [ ] Create `DirectEditableCellV2.tsx` (run in parallel with old)
- [ ] Use `useDataGridContext()` for all data
- [ ] Props: Only `rowIndex`, `columnIndex`
- [ ] Local state: Only `editValue` (for input control)
- [ ] Remove all sync effects
- [ ] Call `context.updateCell()` for saves
- [ ] Test thoroughly in isolation
- [ ] Add feature flag to switch between v1/v2

#### Files to Create
- `src/app/_components/base/DataGrid/components/DirectEditableCellV2.tsx` (new)

#### Files to Modify
- `src/app/_components/base/DataGrid/components/DataGridTable.tsx` (add feature flag)

---

### Task 2.2: A/B Test New Cell

**Goal**: Test new cell with real usage
**Time**: 2-3 hours
**Risk**: MEDIUM

#### Checklist
- [ ] Add environment variable `NEXT_PUBLIC_USE_NEW_CELL`
- [ ] Test editing numbers
- [ ] Test editing text
- [ ] Test keyboard shortcuts (Enter, Escape, Arrow keys)
- [ ] Test validation (invalid numbers)
- [ ] Test optimistic updates
- [ ] Test error handling
- [ ] Monitor performance
- [ ] Check for memory leaks

#### Manual Test Cases
- [ ] Type in cell, press Enter → saves
- [ ] Type in cell, press Escape → cancels
- [ ] Type in cell, click outside → saves
- [ ] Type invalid number → shows validation error
- [ ] Delete key when cell selected → clears value
- [ ] Arrow keys → navigate between cells
- [ ] Double-click cell → starts editing
- [ ] Network error → reverts to original value

---

### Task 2.3: Replace Old Cell Implementation

**Goal**: Remove old cell, use new one everywhere
**Time**: 2-3 hours
**Risk**: LOW (if Task 2.2 passed)

#### Checklist
- [ ] Remove feature flag
- [ ] Delete `DirectEditableCell.tsx` (old version)
- [ ] Rename `DirectEditableCellV2.tsx` → `DirectEditableCell.tsx`
- [ ] Update imports
- [ ] Remove unused props from DataGridTable
- [ ] Clean up prop types
- [ ] Run full test suite
- [ ] Deploy to staging

#### Files to Delete
- `src/app/_components/base/DataGrid/components/DirectEditableCell.tsx` (old)

#### Files to Rename
- `DirectEditableCellV2.tsx` → `DirectEditableCell.tsx`

#### Files to Modify
- `DataGridTable.tsx` (remove props passing)

---

### Task 2.4: Simplify DataGridTable Props

**Goal**: Remove unnecessary prop drilling
**Time**: 1-2 hours
**Risk**: LOW

#### Checklist
- [ ] Remove `filters` prop (cells get from context)
- [ ] Remove `sorts` prop (cells get from context)
- [ ] Remove `searchTerm` prop (cells get from context)
- [ ] Remove `tableId` prop (cells get from context)
- [ ] Remove `rowsByIndex` prop (cells get from context)
- [ ] Remove `totalCount` prop (cells get from context)
- [ ] Keep only rendering props: `virtualRows`, `paddingTop`, `paddingBottom`
- [ ] Update TypeScript types
- [ ] Test everything still works

#### Props Before
```tsx
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
```

#### Props After
```tsx
<DataGridTable
  virtualRows={virtualRows}
  paddingTop={paddingTop}
  paddingBottom={paddingBottom}
/>
```

---

## 🎨 Phase 3: Polish (Week 3)

### Task 3.1: Extract Search Match Counter

**Goal**: Move search counting logic out of DataGrid
**Time**: 2-3 hours
**Risk**: LOW

#### Checklist
- [ ] Create `hooks/useSearchMatchCount.tsx`
- [ ] Move search counting logic from DataGrid
- [ ] Use `useDataGridContext()` for data access
- [ ] Return `matchCount` value
- [ ] Use in search input component
- [ ] Write unit tests

#### Files to Create
- `src/app/_components/base/DataGrid/hooks/useSearchMatchCount.tsx` (new)

#### Files to Modify
- `src/app/_components/base/DataGrid.tsx` (remove search counting)
- `src/app/_components/base/ViewToolbar.tsx` (use hook for count)

---

### Task 3.2: Simplify Optimistic Updates

**Goal**: Use standard TanStack Query pattern
**Time**: 4-5 hours
**Risk**: MEDIUM

#### Checklist
- [ ] Remove `clearingRowIds` state
- [ ] Remove `allClearedRowIdsRef` ref
- [ ] Remove `optimisticRowsByIndex` memo
- [ ] Remove auto-clear effect
- [ ] Use TanStack Query's `onMutate`/`onError` properly
- [ ] Update `rowsByIndex` directly in context
- [ ] Test clearing single row
- [ ] Test clearing multiple rows
- [ ] Test error handling

#### Code to Remove
From `DataGrid.tsx` lines 79-270:
- Lines 79-113: Mutation setup with refs
- Lines 248-270: Auto-clear effect
- Lines 205-235: Optimistic map creation

---

### Task 3.3: Consolidate Context Providers

**Goal**: Reduce context nesting
**Time**: 2-3 hours
**Risk**: LOW

#### Checklist
- [ ] Move selection state into DataGridContext
- [ ] Move context menu state into DataGridContext
- [ ] Remove separate SelectionProvider
- [ ] Remove separate ContextMenuProvider
- [ ] Update all components to use DataGridContext
- [ ] Test selection still works
- [ ] Test context menus still work

#### Before
```tsx
<ViewConfigProvider>
  <SelectionProvider>
    <ContextMenuProvider>
      <DataGrid />
    </ContextMenuProvider>
  </SelectionProvider>
</ViewConfigProvider>
```

#### After
```tsx
<DataGridProvider>
  <DataGrid />
</DataGridProvider>
```

---

### Task 3.4: Add Comprehensive Tests

**Goal**: Ensure refactoring didn't break anything
**Time**: 4-6 hours
**Risk**: LOW

#### Checklist
- [ ] Unit tests for `useDataGridContext`
- [ ] Unit tests for `useDataGridKeyboard`
- [ ] Unit tests for `useScrollPosition`
- [ ] Unit tests for `useSearchMatchCount`
- [ ] Integration tests for cell editing
- [ ] Integration tests for selection
- [ ] Integration tests for keyboard shortcuts
- [ ] E2E tests for full workflows
- [ ] Performance tests (render time, memory)
- [ ] Accessibility tests

#### Test Coverage Goals
- [ ] Context: 90%+
- [ ] Hooks: 85%+
- [ ] Components: 80%+
- [ ] Overall: 80%+

---

## 📊 Progress Tracking

### Metrics to Track

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| DataGrid.tsx lines | 570 | 250 | |
| DirectEditableCell.tsx lines | 412 | 200 | |
| Props passed to table | 13 | 3 | |
| Props passed to cell | 11 | 2 | |
| Context providers | 4 | 2 | |
| State pieces | 15 | 8 | |
| Test coverage | 0% | 80% | |

### Phase Completion

- [ ] Phase 1: Foundation (Week 1)
  - [ ] Task 1.1: DataGridContext ✅
  - [ ] Task 1.2: Keyboard hook ✅
  - [ ] Task 1.3: Scroll hook ✅
  - [ ] Task 1.4: Wire up context ✅

- [ ] Phase 2: Cell Simplification (Week 2)
  - [ ] Task 2.1: New cell implementation ✅
  - [ ] Task 2.2: A/B testing ✅
  - [ ] Task 2.3: Replace old cell ✅
  - [ ] Task 2.4: Simplify props ✅

- [ ] Phase 3: Polish (Week 3)
  - [ ] Task 3.1: Search counter hook ✅
  - [ ] Task 3.2: Simplify optimistic updates ✅
  - [ ] Task 3.3: Consolidate providers ✅
  - [ ] Task 3.4: Add tests ✅

---

## 🚨 Rollback Procedures

### If Task Fails

1. **Revert commit**: `git revert <commit-hash>`
2. **Disable feature flag**: Set to false in `.env`
3. **Switch back**: Use old implementation
4. **Debug**: Fix issue in isolation
5. **Retry**: When fix is ready

### If Phase Fails

1. **Revert all commits in phase**: `git revert <commit-range>`
2. **Review**: What went wrong?
3. **Plan**: Adjust approach
4. **Retry**: With lessons learned

### Emergency Rollback

```bash
# Nuclear option: Revert everything
git checkout <pre-refactor-commit>
git checkout -b rollback-branch
git push origin rollback-branch

# Deploy old version
npm run build
npm run deploy
```

---

## ✅ Definition of Done

### For Each Task
- [ ] Code written and working
- [ ] Types are correct
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests written and passing
- [ ] Manual testing completed
- [ ] Code reviewed
- [ ] Committed with good message

### For Each Phase
- [ ] All tasks completed
- [ ] All tests passing
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Team demo completed
- [ ] Stakeholder approval

### For Full Refactoring
- [ ] All phases completed
- [ ] Code coverage ≥ 80%
- [ ] Performance ≥ baseline
- [ ] Zero regressions
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Monitoring shows no issues
- [ ] Team trained on new architecture

---

## 📚 Reference Documents

- [DATAGRID_ASSESSMENT.md](./DATAGRID_ASSESSMENT.md) - Full detailed assessment
- [DATAGRID_DIAGRAMS.md](./DATAGRID_DIAGRAMS.md) - Visual diagrams
- [REFACTORING_EXAMPLES.md](./REFACTORING_EXAMPLES.md) - Code examples
- [DATAGRID_SUMMARY.md](./DATAGRID_SUMMARY.md) - Quick summary

---

## 🎯 Success Criteria

### Code Quality
- [ ] Cyclomatic complexity < 10 per function
- [ ] File length < 300 lines
- [ ] Max 5 props per component
- [ ] No prop drilling > 2 levels
- [ ] Single responsibility per component

### Performance
- [ ] Initial render time ≤ baseline
- [ ] Cell edit latency ≤ 50ms
- [ ] Scroll FPS ≥ 60
- [ ] Memory usage ≤ baseline + 10%

### Developer Experience
- [ ] New features take < 2 files to add
- [ ] Bugs are easy to debug
- [ ] Code is easy to understand
- [ ] Tests are easy to write

---

## 🚀 Ready to Start?

**Recommended starting point**: Task 1.1 (Create DataGridContext)

This is the foundation everything else builds on. Once you have the context, the rest falls into place naturally.

Want me to implement Task 1.1 now? Just say the word! 🎯

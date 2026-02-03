"use client";

import { DataGridHeader } from "./DataGridHeader";
import { AddRowButton } from "./AddRowButton";
import { RowNumberCell } from "./RowNumberCell";
import { DirectEditableCell } from "./DirectEditableCell";
import { SkeletonRow } from "./SkeletonRow";
import { useSelection } from "../hooks/useSelection";
import { useDataGridContext } from "../_state";
import { useViewConfig } from "../../_state/view-config";

/**
 * DATAGRID TABLE
 *
 * Renders the table with header and rows.
 * All props now come from context - no more prop drilling!
 */
export function DataGridTable() {
  // Get all data from context
  const {
    tableInstance,
    tableId,
    viewId,
    virtualRows,
    paddingTop,
    paddingBottom,
    tableWidth,
    rowsByIndex,
  } = useDataGridContext();

  // Get view config for highlighting
  const { filters, sorts, search } = useViewConfig();

  // Get selection state
  const { isRowSelected, isColumnSelected } = useSelection();

  const columns = tableInstance.getAllColumns();

  return (
    <table
      className="border-separate border-spacing-0"
      style={{ tableLayout: "fixed", width: tableWidth }}
    >
      <DataGridHeader />

      <tbody className="bg-white">
        {/* Top padding for virtualization */}
        {paddingTop > 0 && (
          <tr>
            <td style={{ height: `${paddingTop}px` }} />
          </tr>
        )}

        {/* Visible rows */}
        {virtualRows.map((virtualRow) => {
          // Look up row data directly from the map using the virtual index
          // This is the source of truth for windowed data
          // Note: rowsByIndex already includes optimistic updates from parent
          const rowData = rowsByIndex.get(virtualRow.index);

          // Row data exists - render with proper cell components
          if (rowData) {
            const rowSelected = isRowSelected(virtualRow.index);

            return (
              <tr
                key={rowData.id}
                className={`relative ${rowSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                style={{ height: `${virtualRow.size}px` }}
              >
                {columns.map((column, cellIndex) => {
                  const columnSelected = isColumnSelected(cellIndex);

                  // First column is row number
                  if (cellIndex === 0) {
                    return (
                      <td
                        key={`${rowData.id}-rownum`}
                        className={`relative border-r border-b border-gray-200 ${
                          columnSelected
                            ? "bg-blue-50"
                            : rowSelected
                              ? "bg-blue-50"
                              : "bg-white"
                        }`}
                        style={{
                          width: column.getSize(),
                          maxWidth: column.getSize(),
                          position: "sticky",
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        <RowNumberCell
                          rowIndex={virtualRow.index}
                          rowNumber={virtualRow.index + 1}
                          rowId={rowData.id}
                          tableId={tableId}
                        />
                      </td>
                    );
                  }

                  // Data columns
                  const columnId = column.id;
                  const cellValue = rowData.data[columnId] ?? null;
                  const columnMeta = column.columnDef.meta as
                    | { type?: "TEXT" | "NUMBER" }
                    | undefined;
                  const columnType = columnMeta?.type ?? "TEXT";

                  return (
                    <td
                      key={`${rowData.id}-${columnId}`}
                      className={`relative border-r border-b border-gray-200 ${
                        columnSelected ? "bg-blue-50" : ""
                      }`}
                      style={{
                        width: column.getSize(),
                        maxWidth: column.getSize(),
                      }}
                    >
                      <DirectEditableCell
                        rowIndex={virtualRow.index}
                        rowId={rowData.id}
                        tableId={tableId}
                        columnId={columnId}
                        columnIndex={cellIndex}
                        columnType={columnType}
                        value={cellValue}
                        searchTerm={search}
                        filters={filters}
                        sorts={sorts}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          }

          // No data yet - render skeleton loading row
          return (
            <SkeletonRow
              key={`loading-${virtualRow.index}`}
              columnCount={columns.length}
              rowHeight={virtualRow.size}
              columns={columns}
              index={virtualRow.index}
            />
          );
        })}

        {/* Bottom padding for virtualization */}
        {paddingBottom > 0 && (
          <tr>
            <td style={{ height: `${paddingBottom}px` }} />
          </tr>
        )}

        {/* Add row button */}
        <tr>
          <td colSpan={columns.length} className="border-r border-gray-200 p-0">
            <AddRowButton tableId={tableId} viewId={viewId} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

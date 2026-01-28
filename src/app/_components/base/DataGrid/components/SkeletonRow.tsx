"use client";

interface SkeletonRowProps {
  columnCount: number;
  rowHeight: number;
  columns: { getSize: () => number }[];
  index: number; // Used to vary skeleton widths
}

export function SkeletonRow({ columnCount, rowHeight, columns, index }: SkeletonRowProps) {
  // Use index to create varied but consistent skeleton widths
  const getSkeletonWidth = (cellIndex: number) => {
    const seed = (index + cellIndex) * 1234567;
    const random = Math.abs(Math.sin(seed)) * 100;
    return Math.floor(random % 50) + 30; // 30-80%
  };

  return (
    <tr className="relative bg-white" style={{ height: `${rowHeight}px` }}>
      {columns.map((column, cellIndex) => {
        // First column is row number
        if (cellIndex === 0) {
          return (
            <td
              key={`skeleton-rownum-${cellIndex}`}
              className="relative border-r border-b border-gray-200 bg-white"
              style={{
                width: column.getSize(),
                maxWidth: column.getSize(),
                position: "sticky",
                left: 0,
                zIndex: 25,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <div className="h-4 w-8 animate-pulse rounded bg-gray-200" />
              </div>
            </td>
          );
        }

        // Data columns with skeleton content - match DirectEditableCell structure
        return (
          <td
            key={`skeleton-cell-${cellIndex}`}
            className="relative border-r border-b border-gray-200"
            style={{
              width: column.getSize(),
              maxWidth: column.getSize(),
            }}
          >
            {/* Match the absolute positioning and padding of DirectEditableCell */}
            <div className="absolute inset-0 flex cursor-default items-center overflow-hidden px-2">
              {/* Skeleton bar that looks like text */}
              <div 
                className="h-3.5 animate-pulse rounded bg-gray-200"
                style={{ 
                  width: `${getSkeletonWidth(cellIndex)}%` 
                }}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

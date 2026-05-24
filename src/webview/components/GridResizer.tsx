import React, { useState, useCallback, useEffect } from 'react';
import { GridLayoutItem } from '../../shared/types';

interface GridResizerProps {
  layout: GridLayoutItem[];
  cols: number; // total grid columns (e.g., 6 for 2x2 layout)
  rows: number; // logical rows (e.g., 2 for 2x2 layout)
  containerWidth: number;
  containerHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLayoutChange: (newLayout: GridLayoutItem[]) => void;
}

/**
 * GridResizer - DOM-based grid splitters
 *
 * Strategy: Instead of calculating positions ourselves (which always drifts from
 * react-grid-layout's actual rendering), we measure the rendered grid items'
 * bounding boxes and place splitters at the gaps between them.
 *
 * When dragging, we directly mutate the layout items' w/h in grid units,
 * letting react-grid-layout re-render with the new sizes.
 */
const GridResizer: React.FC<GridResizerProps> = ({
  layout,
  cols,
  rows,
  containerWidth,
  containerHeight,
  containerRef,
  onLayoutChange,
}) => {
  const [isDragging, setIsDragging] = useState<'col' | 'row' | null>(null);
  const [dragIndex, setDragIndex] = useState<number>(-1);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  const [dragStartLayout, setDragStartLayout] = useState<GridLayoutItem[]>([]);

  // Measure all grid items and compute splitter positions
  const measureSplitters = () => {
    if (!containerRef.current) return { colPositions: [] as number[], rowPositions: [] as number[] };

    const gridItems = containerRef.current.querySelectorAll('.react-grid-item');
    if (gridItems.length === 0) return { colPositions: [] as number[], rowPositions: [] as number[] };

    const containerRect = containerRef.current.getBoundingClientRect();
    const itemRects: { el: Element; x: number; y: number; r: number; b: number }[] = [];

    gridItems.forEach((el) => {
      const rect = el.getBoundingClientRect();
      itemRects.push({
        el,
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        r: rect.right - containerRect.left,
        b: rect.bottom - containerRect.top,
      });
    });

    // Find vertical splitters (between columns)
    // Group items by row, find right edges that align with left edges of next column
    const colPositions: number[] = [];
    for (let c = 0; c < cols - 1; c++) {
      // Find items whose right edge is at the boundary between column c and c+1
      // Boundary x = (c+1) * cellWidth in grid units, but we measure in pixels
      const boundaryItems = itemRects.filter((item) => {
        const layoutItem = layout.find((li) => li.i === item.el.getAttribute('data-grid-key'));
        if (!layoutItem) return false;
        const itemEndCol = layoutItem.x + layoutItem.w;
        return layoutItem.x <= c * 3 && itemEndCol > c * 3 && itemEndCol <= (c + 1) * 3;
      });

      if (boundaryItems.length > 0) {
        // Use the right edge of items ending at this column boundary
        const rightEdge = Math.max(...boundaryItems.map((i) => i.r));
        colPositions.push(rightEdge);
      }
    }

    // Find horizontal splitters (between rows)
    const rowPositions: number[] = [];
    for (let r = 0; r < rows - 1; r++) {
      const boundaryItems = itemRects.filter((item) => {
        const layoutItem = layout.find((li) => li.i === item.el.getAttribute('data-grid-key'));
        if (!layoutItem) return false;
        const itemEndRow = layoutItem.y + layoutItem.h;
        return layoutItem.y <= r * 3 && itemEndRow > r * 3 && itemEndRow <= (r + 1) * 3;
      });

      if (boundaryItems.length > 0) {
        const bottomEdge = Math.max(...boundaryItems.map((i) => i.b));
        rowPositions.push(bottomEdge);
      }
    }

    return { colPositions, rowPositions };
  };

  const [splitters, setSplitters] = useState<{ colPositions: number[]; rowPositions: number[] }>({
    colPositions: [],
    rowPositions: [],
  });

  // Re-measure when layout or container size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplitters(measureSplitters());
    }, 50); // Small delay to let react-grid-layout finish rendering
    return () => clearTimeout(timer);
  }, [layout, containerWidth, containerHeight]);

  const handleMouseDown = useCallback(
    (type: 'col' | 'row', index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(type);
      setDragIndex(index);
      setDragStartPos(type === 'col' ? e.clientX : e.clientY);
      setDragStartLayout(layout);
    },
    [layout]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || dragIndex < 0) return;

      const currentPos = isDragging === 'col' ? e.clientX : e.clientY;
      const deltaPx = currentPos - dragStartPos;

      if (isDragging === 'col') {
        // Convert pixel delta to grid units
        // Each grid unit = containerWidth / cols pixels (approximately, ignoring margins)
        // Better: use the actual cell width from measurement
        const cellWidthPx = containerWidth / cols;
        const deltaGrid = Math.round(deltaPx / cellWidthPx);

        if (deltaGrid === 0) return;

        const newLayout = dragStartLayout.map((item) => ({ ...item }));
        const boundaryCol = (dragIndex + 1) * 3; // grid column boundary

        // Find items that end at this boundary (left side) and items that start at this boundary (right side)
        const leftItems = newLayout.filter((item) => item.x + item.w === boundaryCol);
        const rightItems = newLayout.filter((item) => item.x === boundaryCol);

        // Check constraints
        const canShrinkLeft = leftItems.every((item) => item.w > 1);
        const canShrinkRight = rightItems.every((item) => item.w > 1);

        if (deltaGrid > 0) {
          // Dragging right: left items grow, right items shrink
          if (!canShrinkRight) return;
          leftItems.forEach((item) => (item.w += deltaGrid));
          rightItems.forEach((item) => {
            item.x += deltaGrid;
            item.w -= deltaGrid;
          });
        } else {
          // Dragging left: left items shrink, right items grow
          if (!canShrinkLeft) return;
          leftItems.forEach((item) => (item.w += deltaGrid)); // deltaGrid is negative
          rightItems.forEach((item) => {
            item.x += deltaGrid;
            item.w -= deltaGrid; // deltaGrid is negative, so this grows
          });
        }

        onLayoutChange(newLayout);
        setDragStartPos(currentPos);
        setDragStartLayout(newLayout);
      } else {
        // Row resize
        const cellHeightPx = containerHeight / (rows * 3);
        const deltaGrid = Math.round(deltaPx / cellHeightPx);

        if (deltaGrid === 0) return;

        const newLayout = dragStartLayout.map((item) => ({ ...item }));
        const boundaryRow = (dragIndex + 1) * 3;

        const topItems = newLayout.filter((item) => item.y + item.h === boundaryRow);
        const bottomItems = newLayout.filter((item) => item.y === boundaryRow);

        const canShrinkTop = topItems.every((item) => item.h > 1);
        const canShrinkBottom = bottomItems.every((item) => item.h > 1);

        if (deltaGrid > 0) {
          if (!canShrinkBottom) return;
          topItems.forEach((item) => (item.h += deltaGrid));
          bottomItems.forEach((item) => {
            item.y += deltaGrid;
            item.h -= deltaGrid;
          });
        } else {
          if (!canShrinkTop) return;
          topItems.forEach((item) => (item.h += deltaGrid));
          bottomItems.forEach((item) => {
            item.y += deltaGrid;
            item.h -= deltaGrid;
          });
        }

        onLayoutChange(newLayout);
        setDragStartPos(currentPos);
        setDragStartLayout(newLayout);
      }
    },
    [isDragging, dragIndex, dragStartPos, dragStartLayout, cols, rows, containerWidth, containerHeight, onLayoutChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragIndex(-1);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const logicalCols = Math.ceil(cols / 3);
  const logicalRows = rows;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Vertical resizers (between columns) */}
      {Array.from({ length: Math.max(0, logicalCols - 1) }).map((_, index) => {
        const position = splitters.colPositions[index];
        if (position === undefined) return null;

        return (
          <div
            key={`col-resizer-${index}`}
            style={{
              position: 'absolute',
              left: position - 3,
              top: 0,
              width: 6,
              height: containerHeight,
              cursor: 'col-resize',
              background: isDragging === 'col' && dragIndex === index ? 'var(--tg-border-strong)' : 'transparent',
              zIndex: 10,
              pointerEvents: 'auto',
              transition: isDragging ? 'none' : 'background 0.2s',
            }}
            onMouseDown={(e) => handleMouseDown('col', index, e)}
            onMouseEnter={(e) => {
              if (!isDragging) e.currentTarget.style.background = 'var(--tg-border-strong)';
            }}
            onMouseLeave={(e) => {
              if (!isDragging || dragIndex !== index) e.currentTarget.style.background = 'transparent';
            }}
          />
        );
      })}

      {/* Horizontal resizers (between rows) */}
      {Array.from({ length: Math.max(0, logicalRows - 1) }).map((_, index) => {
        const position = splitters.rowPositions[index];
        if (position === undefined) return null;

        return (
          <div
            key={`row-resizer-${index}`}
            style={{
              position: 'absolute',
              left: 0,
              top: position - 3,
              width: containerWidth,
              height: 6,
              cursor: 'row-resize',
              background: isDragging === 'row' && dragIndex === index ? 'var(--tg-border-strong)' : 'transparent',
              zIndex: 10,
              pointerEvents: 'auto',
              transition: isDragging ? 'none' : 'background 0.2s',
            }}
            onMouseDown={(e) => handleMouseDown('row', index, e)}
            onMouseEnter={(e) => {
              if (!isDragging) e.currentTarget.style.background = 'var(--tg-border-strong)';
            }}
            onMouseLeave={(e) => {
              if (!isDragging || dragIndex !== index) e.currentTarget.style.background = 'transparent';
            }}
          />
        );
      })}

      {isDragging && (
        <style>{`
          body {
            cursor: ${isDragging === 'col' ? 'col-resize' : 'row-resize'} !important;
            user-select: none !important;
          }
        `}</style>
      )}
    </div>
  );
};

export default GridResizer;

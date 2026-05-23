import React, { useState, useCallback, useEffect } from 'react';

interface GridResizerProps {
  rows: number;
  cols: number;
  containerWidth: number;
  containerHeight: number;
  onLayoutChange?: (layout: { colWidths: number[]; rowHeights: number[] }) => void;
}

const GridResizer: React.FC<GridResizerProps> = ({
  rows,
  cols,
  containerWidth,
  containerHeight,
  onLayoutChange,
}) => {
  const [isDragging, setIsDragging] = useState<'col' | 'row' | null>(null);
  const [dragIndex, setDragIndex] = useState<number>(-1);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  const [currentWidths, setCurrentWidths] = useState<number[]>(() => Array(cols).fill(1));
  const [currentHeights, setCurrentHeights] = useState<number[]>(() => Array(rows).fill(1));
  const effectiveWidths = currentWidths.length === cols ? currentWidths : Array(cols).fill(1);
  const effectiveHeights = currentHeights.length === rows ? currentHeights : Array(rows).fill(1);

  const cellWidth = containerWidth / cols;
  const cellHeight = containerHeight / rows;

  const handleMouseDown = useCallback(
    (type: 'col' | 'row', index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(type);
      setDragIndex(index);
      setDragStartPos(type === 'col' ? e.clientX : e.clientY);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || dragIndex < 0) return;

      const currentPos = isDragging === 'col' ? e.clientX : e.clientY;
      const delta = currentPos - dragStartPos;

      if (isDragging === 'col') {
        const newWidths = [...effectiveWidths];
        const leftWidth = cellWidth * newWidths[dragIndex] + delta;
        const rightWidth = cellWidth * newWidths[dragIndex + 1] - delta;

        if (leftWidth > 30 && rightWidth > 30) {
          newWidths[dragIndex] = leftWidth / cellWidth;
          newWidths[dragIndex + 1] = rightWidth / cellWidth;
          setCurrentWidths(newWidths);
        }
      } else {
        const newHeights = [...effectiveHeights];
        const topHeight = cellHeight * newHeights[dragIndex] + delta;
        const bottomHeight = cellHeight * newHeights[dragIndex + 1] - delta;

        if (topHeight > 30 && bottomHeight > 30) {
          newHeights[dragIndex] = topHeight / cellHeight;
          newHeights[dragIndex + 1] = bottomHeight / cellHeight;
          setCurrentHeights(newHeights);
        }
      }
    },
    [cellHeight, cellWidth, dragIndex, dragStartPos, effectiveHeights, effectiveWidths, isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && onLayoutChange) {
      onLayoutChange({
        colWidths: effectiveWidths,
        rowHeights: effectiveHeights,
      });
    }
    setIsDragging(null);
    setDragIndex(-1);
  }, [effectiveHeights, effectiveWidths, isDragging, onLayoutChange]);

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

  return (
    <>
      {/* Vertical resizers (between columns) */}
      {Array.from({ length: cols - 1 }).map((_, index) => {
        const widthsForLayout = currentWidths.length === cols ? currentWidths : effectiveWidths;
        const position = widthsForLayout
          .slice(0, index + 1)
          .reduce((sum, w) => sum + cellWidth * w, 0);
        
        return (
          <div
            key={`col-resizer-${index}`}
            className={`grid-resizer ${isDragging === 'col' && dragIndex === index ? 'active' : ''}`}
            style={{
              position: 'absolute',
              left: position,
              top: 0,
              width: '6px',
              height: containerHeight,
              marginLeft: '-3px',
              cursor: 'col-resize',
              background: 'transparent',
              zIndex: 10,
              transition: isDragging ? 'none' : 'background 0.2s',
            }}
            onMouseDown={(e) => handleMouseDown('col', index, e)}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.background = 'var(--tg-border-strong)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging || dragIndex !== index) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          />
        );
      })}

      {/* Horizontal resizers (between rows) */}
      {Array.from({ length: rows - 1 }).map((_, index) => {
        const heightsForLayout = currentHeights.length === rows ? currentHeights : effectiveHeights;
        const position = heightsForLayout
          .slice(0, index + 1)
          .reduce((sum, h) => sum + cellHeight * h, 0);
        
        return (
          <div
            key={`row-resizer-${index}`}
            className={`grid-resizer ${isDragging === 'row' && dragIndex === index ? 'active' : ''}`}
            style={{
              position: 'absolute',
              left: 0,
              top: position,
              width: containerWidth,
              height: '6px',
              marginTop: '-3px',
              cursor: 'row-resize',
              background: 'transparent',
              zIndex: 10,
              transition: isDragging ? 'none' : 'background 0.2s',
            }}
            onMouseDown={(e) => handleMouseDown('row', index, e)}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.background = 'var(--tg-border-strong)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging || dragIndex !== index) {
                e.currentTarget.style.background = 'transparent';
              }
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
    </>
  );
};

export default GridResizer;

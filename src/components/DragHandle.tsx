'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface DragHandleProps {
  onHeightChange: (heightVh: number) => void;
  onDragEnd: () => void;
  currentHeight: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

export default function DragHandle({
  onHeightChange,
  onDragEnd,
  currentHeight,
  minHeight = 25,
  maxHeight = 70,
  className = '',
}: DragHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(currentHeight);

  const handleStart = useCallback((clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = currentHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [currentHeight]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    const deltaY = clientY - startYRef.current;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaVh));

    onHeightChange(newHeight);
  }, [isDragging, minHeight, maxHeight, onHeightChange]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    onDragEnd();
  }, [isDragging, onDragEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleStart(e.touches[0].clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  }, [handleMove]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientY);
  }, [handleStart]);

  // Global event listeners for mouse drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    const handleTouchEndGlobal = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    window.addEventListener('touchend', handleTouchEndGlobal);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div
      className={`relative flex items-center justify-center h-5 cursor-ns-resize touch-none select-none ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      role="separator"
      aria-orientation="horizontal"
      aria-label="차트 크기 조절"
      aria-valuenow={Math.round(currentHeight)}
      aria-valuemin={minHeight}
      aria-valuemax={maxHeight}
    >
      {/* 배경 라인 */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border-primary/50" />

      {/* 드래그 핸들 pill */}
      <div
        className={`relative z-10 flex items-center justify-center w-12 h-1.5 rounded-full transition-all duration-150 ${
          isDragging
            ? 'bg-point scale-110 shadow-lg shadow-point/30'
            : 'bg-border-secondary hover:bg-fg-tertiary hover:scale-105'
        }`}
      >
        {/* 점 3개 (시각적 힌트) */}
        <div className="flex gap-0.5">
          <span className={`w-1 h-1 rounded-full ${isDragging ? 'bg-white/80' : 'bg-fg-muted'}`} />
          <span className={`w-1 h-1 rounded-full ${isDragging ? 'bg-white/80' : 'bg-fg-muted'}`} />
          <span className={`w-1 h-1 rounded-full ${isDragging ? 'bg-white/80' : 'bg-fg-muted'}`} />
        </div>
      </div>

      {/* 드래그 중 힌트 표시 */}
      {isDragging && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-bg-elevated/90 text-[10px] font-mono text-fg-secondary">
          {Math.round(currentHeight)}%
        </div>
      )}
    </div>
  );
}

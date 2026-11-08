'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { TableItem } from '@/lib/db';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Check, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface FloorPlanViewerProps {
  tables: TableItem[];
  selectedTable: TableItem | null;
  onSelectTable: (table: TableItem) => void;
  searchQuery: string;
}

// Memoized Table Pin Component - Prevents re-rendering all 107 pins during zoom/pan!
interface TablePinProps {
  table: TableItem;
  isSelected: boolean;
  isMatchSearch: boolean;
  onSelect: (table: TableItem) => void;
  onHover: (table: TableItem | null, rect?: DOMRect) => void;
}

const TablePin = memo(function TablePin({
  table,
  isSelected,
  isMatchSearch,
  onSelect,
  onHover
}: TablePinProps) {
  let badgeBg = 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600';
  let pulseRing = '';

  if (table.status === 'PAID') {
    badgeBg = 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700';
  } else if (table.status === 'RESERVED') {
    badgeBg = 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600';
  } else if (table.status === 'AVAILABLE') {
    pulseRing = 'ring-1 ring-emerald-400/40 hover:ring-3';
  }

  if (isSelected) {
    badgeBg += ' ring-4 ring-blue-500 scale-125 z-30 shadow-xl';
  } else if (isMatchSearch) {
    badgeBg += ' ring-4 ring-purple-500 scale-125 z-30 animate-bounce';
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect(table);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(table);
      }}
      onMouseEnter={(e) => onHover(table, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => onHover(null)}
      style={{
        left: `${table.x_percent}%`,
        top: `${table.y_percent}%`,
        transform: 'translate3d(-50%, -50%, 0)'
      }}
      className={`absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-bold border shadow-xs transition-transform duration-100 cursor-pointer select-none ${badgeBg} ${pulseRing}`}
      title={`โต๊ะหมายเลข ${table.table_number}`}
    >
      {table.status === 'PAID' ? (
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      ) : (
        <span>{table.table_number}</span>
      )}
    </button>
  );
});

export default function FloorPlanViewer({
  tables,
  selectedTable,
  onSelectTable,
  searchQuery
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Position and Scale kept in Ref for 120 FPS hardware accelerated movement
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Tooltip state
  const [hoverData, setHoverData] = useState<{ table: TableItem; x: number; y: number } | null>(null);

  // Apply transform with GPU acceleration (translate3d)
  const applyTransform = useCallback((animate = false) => {
    if (!contentRef.current) return;
    const { x, y } = posRef.current;
    const s = scaleRef.current;
    contentRef.current.style.transition = animate ? 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
    contentRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }, []);

  const resetView = useCallback(() => {
    posRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    applyTransform(true);
  }, [applyTransform]);

  const handleZoomIn = () => {
    scaleRef.current = Math.min(scaleRef.current + 0.25, 3.0);
    applyTransform(true);
  };

  const handleZoomOut = () => {
    scaleRef.current = Math.max(scaleRef.current - 0.25, 0.6);
    applyTransform(true);
  };

  // Mouse pan handlers - Uses requestAnimationFrame for zero-lag 120 FPS
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y
    };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    posRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    };

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        applyTransform(false);
        rafIdRef.current = null;
      });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
    scaleRef.current = Math.min(Math.max(scaleRef.current + zoomFactor, 0.6), 3.0);
    applyTransform(false);
  };

  // Touch pan & pinch handlers for Mobile / Tablet (Hardware accelerated)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - posRef.current.x,
        y: e.touches[0].clientY - posRef.current.y
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      posRef.current = {
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          applyTransform(false);
          rafIdRef.current = null;
        });
      }
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (currentDist - touchDistanceRef.current) * 0.005;
      scaleRef.current = Math.min(Math.max(scaleRef.current + diff, 0.6), 3.0);
      touchDistanceRef.current = currentDist;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          applyTransform(false);
          rafIdRef.current = null;
        });
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchDistanceRef.current = null;
  };

  // Hover callback
  const handleHoverPin = useCallback((table: TableItem | null, rect?: DOMRect) => {
    if (!table || !rect || !containerRef.current) {
      setHoverData(null);
      return;
    }
    const contRect = containerRef.current.getBoundingClientRect();
    setHoverData({
      table,
      x: rect.left - contRect.left + rect.width / 2,
      y: rect.top - contRect.top - 10
    });
  }, []);

  // Search auto-focus
  useEffect(() => {
    if (!searchQuery) return;
    const num = parseInt(searchQuery.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 107) {
      const target = tables.find(t => t.table_number === num);
      if (target && containerRef.current) {
        scaleRef.current = 1.6;
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const targetX = (target.x_percent / 100) * 731;
        const targetY = (target.y_percent / 100) * 838;
        posRef.current = {
          x: containerWidth / 2 - targetX * 1.6,
          y: containerHeight / 2 - targetY * 1.6
        };
        applyTransform(true);
      }
    }
  }, [searchQuery, tables, applyTransform]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] bg-slate-100 overflow-hidden select-none border border-slate-200 rounded-2xl shadow-inner">
      {/* Zoom / Pan Controls Overlay */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5 bg-white/95 p-1.5 rounded-2xl shadow-md border border-slate-200">
        <button
          type="button"
          onClick={handleZoomIn}
          title="ขยาย (Zoom In)"
          className="p-2 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="ย่อ (Zoom Out)"
          className="p-2 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="w-full h-px bg-slate-200 my-0.5"></div>
        <button
          type="button"
          onClick={resetView}
          title="รีเซ็ตมุมมอง (Reset View)"
          className="p-2 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Legend Card Overlay */}
      <div className="absolute bottom-4 left-4 z-30 bg-white/95 px-3.5 py-2.5 rounded-2xl shadow-md border border-slate-200 text-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 shadow-xs"></span>
          <span>ว่าง (กดจองได้)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 shadow-xs"></span>
          <span>มัดจำแล้ว</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600 shadow-xs"></span>
          <span>ชำระครบแล้ว</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px] pl-2 border-l border-slate-200">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>คลิกที่โต๊ะเพื่อจอง / ดูรายละเอียด</span>
        </div>
      </div>

      {/* Lightweight Floating Tooltip (Only renders on hover, does NOT re-render pins) */}
      {hoverData && (
        <div 
          className="absolute z-40 pointer-events-none bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-xs transition-opacity duration-100"
          style={{
            left: `${Math.min(Math.max(hoverData.x - 70, 10), (containerRef.current?.clientWidth || 700) - 170)}px`,
            top: `${Math.max(hoverData.y - 70, 10)}px`
          }}
        >
          <div className="font-bold flex items-center gap-1.5 text-amber-300">
            <span>โต๊ะหมายเลข {hoverData.table.table_number}</span>
            <span className="text-[10px] text-slate-400">({hoverData.table.row_label})</span>
          </div>
          <div className="text-slate-300 text-[11px] mt-0.5">
            {hoverData.table.status === 'AVAILABLE' ? (
              <span className="text-emerald-400 font-semibold">🟢 โต๊ะว่าง • 3,000 บาท</span>
            ) : hoverData.table.status === 'PAID' ? (
              <span className="text-rose-400 font-semibold">🔴 ชำระครบ: {hoverData.table.booker_name}</span>
            ) : (
              <span className="text-amber-400 font-semibold">🟡 มัดจำแล้ว: {hoverData.table.booker_name}</span>
            )}
          </div>
          {hoverData.table.booker_batch && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              รุ่น/สังกัด: {hoverData.table.booker_batch}
            </div>
          )}
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full flex items-center justify-center cursor-grab touch-none"
      >
        <div
          ref={contentRef}
          style={{
            transform: 'translate3d(0px, 0px, 0) scale(1)',
            transformOrigin: 'center center',
            willChange: 'transform'
          }}
          className="relative w-[731px] h-[838px] shrink-0 shadow-2xl rounded-2xl overflow-hidden bg-white"
        >
          {/* Floor Plan Background Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/floor_plan.jpg"
            alt="ผังโต๊ะงานเลี้ยงรุ่น FINAL"
            className="w-full h-full object-contain pointer-events-none select-none opacity-85"
            draggable={false}
          />

          {/* Table Interactive Badges Overlay (Memoized Pins) */}
          {tables.map(table => {
            const isSelected = selectedTable?.table_number === table.table_number;
            const isMatchSearch = Boolean(
              searchQuery &&
              (table.table_number.toString() === searchQuery.trim() ||
                (table.booker_name && table.booker_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (table.booker_batch && table.booker_batch.toLowerCase().includes(searchQuery.toLowerCase())))
            );

            return (
              <TablePin
                key={table.table_number}
                table={table}
                isSelected={isSelected}
                isMatchSearch={isMatchSearch}
                onSelect={onSelectTable}
                onHover={handleHoverPin}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

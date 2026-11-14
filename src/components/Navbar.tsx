'use client';

import React from 'react';
import { APP_VERSION } from '@/config/version';
import { 
  Map, 
  ListFilter, 
  Search, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Layers,
  Shirt
} from 'lucide-react';

interface NavbarProps {
  stats: {
    total_tables: number;
    available_tables: number;
    reserved_tables: number;
    paid_tables: number;
    locked_tables: number;
  };
  eventTitle: string;
  eventSubtitle?: string;
  viewMode: 'map' | 'list' | 'shirts';
  onViewModeChange: (mode: 'map' | 'list' | 'shirts') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({
  stats,
  eventTitle,
  eventSubtitle,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  isAdmin,
  onOpenAdmin,
  onRefresh,
  isRefreshing
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        {/* Top bar: Title and Action buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight line-clamp-1">
                  {eventTitle || 'ระบบจองโต๊ะงานเลี้ยงรุ่น'}
                </h1>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {eventSubtitle || 'School Reunion Table Reservation • รวม 107 โต๊ะ'}
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-medium">
              <button
                type="button"
                onClick={() => onViewModeChange('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>ผังโต๊ะ</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>รายชื่อ</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('shirts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'shirts'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>สั่งจองเสื้อรุ่น</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              title="รีเฟรชข้อมูลสด"
              className={`p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all ${
                isRefreshing ? 'animate-spin text-blue-600' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Admin Portal Button */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                isAdmin
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'แดชบอร์ดแอดมิน' : 'สำหรับผู้ดูแล'}</span>
            </button>
          </div>
        </div>

        {/* Bottom bar: Real-time Stats & Table Search */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Badges */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ว่าง <strong>{stats.available_tables}</strong> โต๊ะ</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-medium">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>มัดจำแล้ว <strong>{stats.reserved_tables}</strong> โต๊ะ</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 font-medium">
              <CheckCircle2 className="w-3 h-3 text-rose-500" />
              <span>ชำระครบ <strong>{stats.paid_tables}</strong> โต๊ะ</span>
            </div>
          </div>

          {/* Quick Table Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาเลขโต๊ะ (1-107) หรือชื่อผู้จอง..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

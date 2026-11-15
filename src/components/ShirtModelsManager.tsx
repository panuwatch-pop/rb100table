'use client';

import React, { useState } from 'react';
import { Camera, Save, Trash2, RefreshCw, Eye, Check, AlertCircle } from 'lucide-react';
import { ShirtType } from '@/lib/db';

interface ShirtModelsManagerProps {
  shirtTypes: ShirtType[];
  uploadingKey: string | null;
  onUploadImage: (shirtId: number, side: 'front' | 'back', file: File) => void;
  onSaveModel: (shirtId: number, name: string, price: number, description: string, isActive: number) => void;
  onDeleteModel: (shirtId: number, shirtName: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function ShirtModelsManager({
  shirtTypes,
  uploadingKey,
  onUploadImage,
  onSaveModel,
  onDeleteModel,
  onRefresh,
  loading
}: ShirtModelsManagerProps) {
  // Local state for editing fields per shirt model
  const [editStates, setEditStates] = useState<Record<number, {
    name: string;
    price: number;
    description: string;
    is_active: number;
  }>>({});

  const getModelData = (shirt: ShirtType) => {
    return editStates[shirt.id] || {
      name: shirt.name,
      price: shirt.price,
      description: shirt.description || '',
      is_active: shirt.is_active
    };
  };

  const handleFieldChange = (shirtId: number, field: string, value: any, fallback: ShirtType) => {
    const cur = getModelData(fallback);
    setEditStates(prev => ({
      ...prev,
      [shirtId]: {
        ...cur,
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">จัดการแบบเสื้อรุ่น & อัปโหลดรูปภาพ</h4>
          <p className="text-slate-500 text-[11px]">
            สามารถเปลี่ยนรูปด้านหน้าและด้านหลัง แก้ไขราคา และชื่อรุ่นได้ทันที ภาพจะแสดงในหน้าร้านสั่งซื้อทันที
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* Shirt Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shirtTypes.map((shirt) => {
          const curData = getModelData(shirt);
          const isUploadingFront = uploadingKey === `${shirt.id}-front`;
          const isUploadingBack = uploadingKey === `${shirt.id}-back`;

          return (
            <div
              key={shirt.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
            >
              {/* Card Header & Main Info */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                      #{shirt.id}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">ข้อมูลแบบเสื้อ</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <span>สถานะ:</span>
                      <select
                        value={curData.is_active}
                        onChange={(e) => handleFieldChange(shirt.id, 'is_active', Number(e.target.value), shirt)}
                        className={`text-[11px] font-bold rounded-lg px-2 py-0.5 border outline-none ${
                          curData.is_active === 1
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value={1}>เปิดขาย</option>
                        <option value={0}>ปิดการขาย (ซ่อน)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Name & Price Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ชื่อรุ่นแบบเสื้อ
                    </label>
                    <input
                      type="text"
                      value={curData.name}
                      onChange={(e) => handleFieldChange(shirt.id, 'name', e.target.value, shirt)}
                      placeholder="เช่น เสื้อโปโล 100 ปี"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ราคา (บาท)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={curData.price}
                      onChange={(e) => handleFieldChange(shirt.id, 'price', Number(e.target.value), shirt)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    คำอธิบาย / รายละเอียดเนื้อผ้า
                  </label>
                  <input
                    type="text"
                    value={curData.description}
                    onChange={(e) => handleFieldChange(shirt.id, 'description', e.target.value, shirt)}
                    placeholder="เช่น ผ้าคอตตอน 100% สกรีนลายพิเศษ"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Two Pictures: Front and Back Upload Cards */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Front View */}
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 space-y-2 text-center">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>🖼️ รูปด้านหน้า (Front)</span>
                      {shirt.image_front && (
                        <a
                          href={shirt.image_front}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 text-[10px]"
                        >
                          ดูรูปจริง
                        </a>
                      )}
                    </div>

                    <div className="relative w-full h-36 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shirt.image_front || '/shirt_polo_front.svg'}
                        alt="Front View"
                        className="w-full h-full object-contain"
                      />
                      {isUploadingFront && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-xs font-semibold">
                          <RefreshCw className="w-5 h-5 animate-spin mb-1" />
                          <span>กำลังอัปโหลด...</span>
                        </div>
                      )}
                    </div>

                    <label className="block w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-all shadow-2xs">
                      <div className="flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>เปลี่ยนรูปด้านหน้า</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingFront}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadImage(shirt.id, 'front', file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Back View */}
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 space-y-2 text-center">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>🖼️ รูปด้านหลัง (Back)</span>
                      {shirt.image_back && (
                        <a
                          href={shirt.image_back}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 text-[10px]"
                        >
                          ดูรูปจริง
                        </a>
                      )}
                    </div>

                    <div className="relative w-full h-36 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shirt.image_back || '/shirt_polo_back.svg'}
                        alt="Back View"
                        className="w-full h-full object-contain"
                      />
                      {isUploadingBack && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-xs font-semibold">
                          <RefreshCw className="w-5 h-5 animate-spin mb-1" />
                          <span>กำลังอัปโหลด...</span>
                        </div>
                      )}
                    </div>

                    <label className="block w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-all shadow-2xs">
                      <div className="flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>เปลี่ยนรูปด้านหลัง</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingBack}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadImage(shirt.id, 'back', file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Model */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onDeleteModel(shirt.id, shirt.name)}
                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบแบบนี้</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSaveModel(shirt.id, curData.name, curData.price, curData.description, curData.is_active)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกข้อมูลเสื้อรุ่นนี้</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {shirtTypes.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          ยังไม่มีแบบเสื้อรุ่นในระบบ กรุณากดปุ่ม &quot;เพิ่มแบบเสื้อใหม่&quot; ด้านบน
        </div>
      )}
    </div>
  );
}

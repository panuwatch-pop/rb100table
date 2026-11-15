'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TableItem } from '@/lib/db';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  User, 
  Phone, 
  GraduationCap, 
  FileText, 
  QrCode, 
  Upload, 
  Edit3, 
  Trash2, 
  ArrowRightLeft,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Save,
  DollarSign,
  Sparkles
} from 'lucide-react';

interface BookingModalProps {
  table: TableItem | null;
  onClose: () => void;
  onBookingSuccess: () => void;
  onDeleteSuccess?: (tableNumber: number) => void;
  isAdmin: boolean;
  availableTables: TableItem[];
  promptpayNumber: string;
  promptpayName: string;
}

export default function BookingModal({
  table,
  onClose,
  onBookingSuccess,
  onDeleteSuccess,
  isAdmin,
  availableTables,
  promptpayNumber,
  promptpayName
}: BookingModalProps) {
  // Booking Form State
  const [bookerName, setBookerName] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [bookerBatch, setBookerBatch] = useState('');
  const [note, setNote] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full' | 'unpaid'>('deposit');
  const [customDeposit, setCustomDeposit] = useState<string>('1000');
  const [isEarlyBird, setIsEarlyBird] = useState(true);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // Admin Price Edit State
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [depositInput, setDepositInput] = useState<string>('');
  const [priceLoading, setPriceLoading] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [editNote, setEditNote] = useState('');
  const [targetTableNum, setTargetTableNum] = useState<string>('');

  // Status & Loading State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Track the table number to prevent background re-renders from wiping user inputs
  const activeTableNumRef = useRef<number | null>(null);

  useEffect(() => {
    if (!table) {
      activeTableNumRef.current = null;
      return;
    }

    // ONLY initialize form states if user selected a DIFFERENT table
    if (activeTableNumRef.current !== table.table_number) {
      activeTableNumRef.current = table.table_number;
      setBookerName('');
      setBookerPhone('');
      setBookerBatch('');
      setNote('');
      setIsEarlyBird(table.price > 7000);
      setCustomDeposit(table.deposit_amount ? String(table.deposit_amount) : '1000');
      setPriceInput(String(table.price || 3000));
      setDepositInput(String(table.deposit_amount || 1000));
      setIsEditingPrice(false);
      setSlipFile(null);
      setSlipPreview(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setQrCodeUrl(null);
      setIsEditing(false);

      if (table.reservation_id) {
        setEditName(table.booker_name || '');
        setEditPhone(table.booker_phone || '');
        setEditBatch(table.booker_batch || '');
        setEditNote(table.note || '');
        setTargetTableNum(table.table_number.toString());
      }
    } else if (table.reservation_id && !isEditing) {
      // If same table and not actively editing, sync reservation details
      setEditName(table.booker_name || '');
      setEditPhone(table.booker_phone || '');
      setEditBatch(table.booker_batch || '');
      setEditNote(table.note || '');
    }
  }, [table?.table_number, table?.reservation_id, table?.status, table?.price, table?.deposit_amount, isEditing, table]);

  if (!table) return null;

  const isAvailable = table.status === 'AVAILABLE';
  const isPaid = table.status === 'PAID';
  const isReserved = table.status === 'RESERVED';

  // Handle Slip Upload
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  // Submit Booking
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!bookerName.trim() || !bookerPhone.trim()) {
        throw new Error('กรุณากรอกชื่อผู้จองและเบอร์โทรศัพท์ให้ครบถ้วน');
      }

      let uploadedSlipUrl = null;
      if (slipFile) {
        const formData = new FormData();
        formData.append('file', slipFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const upData = await upRes.json();
        if (upData.success) {
          uploadedSlipUrl = upData.url;
        }
      }

      const effectivePrice = isEarlyBird ? 7000 : table.price;

      const depositAmountNum = paymentChoice === 'unpaid'
        ? 0
        : paymentChoice === 'deposit'
          ? (Number(customDeposit) > 0 ? Number(customDeposit) : Math.min(table.deposit_amount, effectivePrice))
          : effectivePrice;

      const paymentStatus = paymentChoice === 'full'
        ? 'fully_paid'
        : paymentChoice === 'unpaid'
          ? 'unpaid'
          : 'deposit_paid';

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: table.table_number,
          booker_name: bookerName.trim(),
          booker_phone: bookerPhone.trim(),
          booker_batch: bookerBatch.trim() || null,
          note: note.trim() || null,
          payment_status: paymentStatus,
          deposit_amount: depositAmountNum,
          custom_price: effectivePrice,
          is_early_bird: isEarlyBird,
          slip_url: uploadedSlipUrl
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'จองโต๊ะไม่สำเร็จ');
      }

      if (paymentChoice === 'unpaid') {
        setSuccessMsg('🎉 จองโต๊ะสำเร็จเรียบร้อยแล้ว! (สถานะ: จองไว้ก่อน ยังไม่ได้ชำระมัดจำ)');
        setQrCodeUrl(null);
      } else {
        setSuccessMsg('🎉 จองโต๊ะสำเร็จเรียบร้อยแล้ว!');
        if (data.data?.qr) {
          setQrCodeUrl(paymentChoice === 'full' ? data.data.qr.full : data.data.qr.deposit);
        }
      }
      onBookingSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Saving Table Price
  const handleSavePrice = async () => {
    if (!isAdmin) return;
    const newPrice = Number(priceInput);
    const newDeposit = Number(depositInput) || undefined;
    if (!newPrice || newPrice <= 0) {
      setErrorMsg('ราคาโต๊ะต้องมากกว่า 0 บาท');
      return;
    }

    setPriceLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/tables/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: table.table_number,
          price: newPrice,
          deposit_amount: newDeposit
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccessMsg(data.message);
      setIsEditingPrice(false);
      onBookingSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  // Update Payment Status
  const handleUpdatePayment = async (status: 'unpaid' | 'deposit_paid' | 'fully_paid') => {
    if (!table.reservation_id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reservations/${table.reservation_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: table.table_number,
          payment_status: status
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'อัปเดตการชำระเงินไม่สำเร็จ');

      setSuccessMsg('อัปเดตสถานะชำระเงินเรียบร้อยแล้ว');
      onBookingSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Edited Details
  const handleSaveEdit = async () => {
    if (!table.reservation_id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!editName.trim() || !editPhone.trim()) {
        throw new Error('กรุณาระบุชื่อผู้จองและเบอร์โทรศัพท์');
      }

      const targetNum = parseInt(targetTableNum, 10);
      const res = await fetch(`/api/reservations/${table.reservation_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booker_name: editName.trim(),
          booker_phone: editPhone.trim(),
          booker_batch: editBatch.trim(),
          note: editNote.trim(),
          target_table_number: targetNum !== table.table_number ? targetNum : undefined
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'บันทึกการแก้ไขไม่สำเร็จ');

      setIsEditing(false);
      setSuccessMsg('บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว');
      onBookingSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete / Cancel Reservation
  const handleDeleteReservation = async () => {
    if (!table.reservation_id) return;
    if (!confirm(`คุณต้องการยกเลิกและลบการจองโต๊ะหมายเลข ${table.table_number} ใช่หรือไม่?\n\nโต๊ะจะกลับมาเป็นสถานะ "ว่าง" ทันที`)) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reservations/${table.reservation_id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'ยกเลิกการจองไม่สำเร็จ');

      if (onDeleteSuccess) {
        onDeleteSuccess(table.table_number);
      }
      onBookingSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-blue-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-xl flex items-center justify-center shadow-inner">
              {table.table_number}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">โต๊ะหมายเลข {table.table_number}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAvailable
                      ? 'bg-emerald-500 text-white'
                      : isPaid
                      ? 'bg-rose-500 text-white'
                      : table.payment_status === 'unpaid'
                      ? 'bg-slate-700 text-amber-300'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {isAvailable 
                    ? 'ว่าง (กดจองได้)' 
                    : isPaid 
                    ? 'ชำระครบ 100%' 
                    : table.payment_status === 'unpaid'
                    ? 'จองแล้ว (ยังไม่มัดจำ)'
                    : 'มัดจำแล้ว'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                แถว {table.row_label} • {table.capacity} ที่นั่ง • ราคา {table.price.toLocaleString()} บาท
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Price Banner */}
        {isAdmin && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
              <span>โหมดแอดมิน: ราคาโต๊ะ {table.price.toLocaleString()} บ. (มัดจำ {table.deposit_amount.toLocaleString()} บ.)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingPrice(!isEditingPrice)}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-200 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              {isEditingPrice ? '✕ ปิด' : '✏️ ปรับราคาโต๊ะนี้'}
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {/* Admin Price Edit Box */}
          {isAdmin && isEditingPrice && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2.5 animate-in fade-in">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>กำหนดราคาเฉพาะสำหรับโต๊ะ #{table.table_number}</span>
                </span>
                <span className="text-[10px] text-amber-700 font-normal">แถว {table.row_label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ราคาโต๊ะ (บาท)</label>
                  <input
                    type="number"
                    min="1"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">มัดจำเริ่มต้น (บาท)</label>
                  <input
                    type="number"
                    min="1"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSavePrice}
                disabled={priceLoading}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {priceLoading ? 'กำลังบันทึกราคา...' : 'บันทึกราคาโต๊ะนี้'}
              </button>
            </div>
          )}
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PromptPay QR Code Display after Booking */}
          {qrCodeUrl && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-2.5">
              <div className="font-bold text-blue-900 text-sm flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-700" />
                <span>สแกน QR Code พร้อมเพย์เพื่อชำระเงิน</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="PromptPay QR Code"
                className="w-48 h-48 mx-auto rounded-xl shadow-md border border-slate-200 bg-white p-1"
              />
              <div className="text-xs text-slate-600">
                พร้อมเพย์: <strong className="text-slate-900">{promptpayNumber}</strong>
                {promptpayName && <span> ({promptpayName})</span>}
              </div>
              <p className="text-[11px] text-slate-500">
                ระบบส่งการแจ้งเตือนเข้ากลุ่ม LINE เรียบร้อยแล้วครับ
              </p>
            </div>
          )}

          {/* SCENARIO 1: TABLE IS AVAILABLE -> BOOKING FORM */}
          {isAvailable && !qrCodeUrl && (
            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อผู้จอง <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={bookerName}
                      onChange={(e) => setBookerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="เช่น สมชาย ใจดี"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={bookerPhone}
                      onChange={(e) => setBookerPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="เช่น 0812345678"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รุ่น / ห้อง / สังกัด
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookerBatch}
                    onChange={(e) => setBookerBatch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="เช่น ม.6/2 รุ่น 45 หรือ โต๊ะครูเก่า"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ขอเก้าอี้เสริม, นั่งใกล้เวที"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Promotional Table Pricing Selection */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span>โปรโมชั่นพิเศษราคาค่าโต๊ะ</span>
                  </div>
                  {isEarlyBird && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                      ลดทันที 1,000 บ.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEarlyBird(true);
                      if (Number(customDeposit) > 7000) setCustomDeposit('7000');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isEarlyBird
                        ? 'border-amber-500 bg-white ring-2 ring-amber-400/40 shadow-xs'
                        : 'border-amber-200/60 bg-white/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-amber-950 text-xs flex items-center justify-between">
                      <span>โปรโมชั่น Early Bird</span>
                      {isEarlyBird && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <div className="text-base font-black text-amber-600 mt-0.5">
                      7,000 <span className="text-[11px] font-normal text-slate-500">บาท/โต๊ะ</span>
                    </div>
                    <div className="text-[10px] text-slate-500 line-through">
                      จากราคาปกติ {table.price > 7000 ? table.price.toLocaleString() : '8,000'} บ.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEarlyBird(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !isEarlyBird
                        ? 'border-blue-500 bg-white ring-2 ring-blue-400/40 shadow-xs'
                        : 'border-amber-200/60 bg-white/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span>ราคามาตรฐาน</span>
                      {!isEarlyBird && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="text-base font-black text-slate-800 mt-0.5">
                      {table.price.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">บาท/โต๊ะ</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ราคาตามผังงาน
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Option Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  ตัวเลือกการชำระเงิน <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Option 1: จองไว้ก่อน (ยังไม่จ่ายมัดจำ) */}
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('unpaid')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'unpaid'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>จองไว้ก่อน</span>
                    </div>
                    <div className="text-amber-800 font-extrabold text-sm mt-0.5">
                      0 บาท
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      ยังไม่จ่ายมัดจำ (ค้างชำระ {(isEarlyBird ? 7000 : table.price).toLocaleString()} บ.)
                    </div>
                  </button>

                  {/* Option 2: ชำระเฉพาะมัดจำ */}
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('deposit')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'deposit'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="font-bold">ชำระเฉพาะมัดจำ</div>
                    <div className="text-blue-700 font-extrabold text-sm mt-0.5">
                      {(Number(customDeposit) || Math.min(table.deposit_amount, isEarlyBird ? 7000 : table.price)).toLocaleString()} บาท
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      คงเหลือ {Math.max(0, (isEarlyBird ? 7000 : table.price) - (Number(customDeposit) || Math.min(table.deposit_amount, isEarlyBird ? 7000 : table.price))).toLocaleString()} บ. ชำระภายหลัง
                    </div>
                  </button>

                  {/* Option 3: ชำระเต็มจำนวน */}
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('full')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'full'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="font-bold">ชำระเต็มจำนวน (ซื้อเลย 100%)</div>
                    <div className="text-emerald-700 font-extrabold text-sm mt-0.5">
                      {(isEarlyBird ? 7000 : table.price).toLocaleString()} บาท
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      ซื้อขาด ไม่ต้องมัดจำ ไม่มียอดค้าง
                    </div>
                  </button>
                </div>

                {/* Flexible Deposit Amount Input when Deposit choice is active */}
                {paymentChoice === 'deposit' && (
                  <div className="mt-2.5 p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5 text-xs animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-950 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                        <span>ระบุจำนวนเงินมัดจำ (ไม่ฟิกยอดเงิน):</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        ขั้นต่ำ 1 บ. - สูงสุด {(isEarlyBird ? 7000 : table.price).toLocaleString()} บ.
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min="1"
                        max={isEarlyBird ? 7000 : table.price}
                        value={customDeposit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDeposit(val);
                          const curLimit = isEarlyBird ? 7000 : table.price;
                          if (Number(val) >= curLimit) {
                            setPaymentChoice('full');
                          }
                        }}
                        placeholder="กรอกจำนวนเงินมัดจำ"
                        className="w-full pl-8 pr-14 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-[11px]">บาท</span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-500">เลือกด่วน:</span>
                      {[500, 1000, 1500, 2000].filter(amt => amt < (isEarlyBird ? 7000 : table.price)).map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomDeposit(String(amt))}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                            Number(customDeposit) === amt
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {amt.toLocaleString()} บ.
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-blue-200/60 font-medium">
                      <span className="text-slate-600">ยอดคงเหลือชำระภายหลัง:</span>
                      <span className="font-bold text-rose-600">
                        {Math.max(0, (isEarlyBird ? 7000 : table.price) - (Number(customDeposit) || 0)).toLocaleString()} บาท
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slip Upload Option */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แนบสลิปโอนเงิน (ถ้ามี)
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/20">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-600 font-medium">
                    {slipFile ? slipFile.name : 'คลิกเพื่อเลือกไฟล์รูปภาพสลิป'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipChange}
                    className="hidden"
                  />
                </label>

                {slipPreview && (
                  <div className="mt-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slipPreview}
                      alt="Slip Preview"
                      className="w-32 h-32 object-cover mx-auto rounded-lg border border-slate-200 shadow-xs"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? 'กำลังบันทึกข้อมูล...'
                  : paymentChoice === 'full'
                  ? `💳 ยืนยันการสั่งซื้อและชำระเต็มจำนวน (${(isEarlyBird ? 7000 : table.price).toLocaleString()} บาท)`
                  : paymentChoice === 'deposit'
                  ? `📝 ยืนยันการจองโต๊ะ (ชำระมัดจำ ${(Number(customDeposit) || Math.min(table.deposit_amount, isEarlyBird ? 7000 : table.price)).toLocaleString()} บาท)`
                  : '📝 ยืนยันการจองโต๊ะ (ยังไม่จ่ายมัดจำ)'}
              </button>
            </form>
          )}

          {/* SCENARIO 2: TABLE IS RESERVED OR PAID -> DETAILS & EDIT & DELETE CONTROLS */}
          {!isAvailable && (
            <div className="space-y-4">
              {/* Booker Info Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">ชื่อผู้จอง:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {table.booker_name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">เบอร์โทรศัพท์:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {table.booker_phone}
                  </span>
                </div>

                {table.booker_batch && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">รุ่น/ห้อง/สังกัด:</span>
                    <span className="text-slate-800 text-xs font-medium">
                      {table.booker_batch}
                    </span>
                  </div>
                )}

                {table.note && (
                  <div className="flex items-start justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">หมายเหตุ:</span>
                    <span className="text-slate-700 text-right max-w-[240px]">
                      {table.note}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">ยอดชำระแล้ว:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {(table.deposit_paid || 0).toLocaleString()} บาท
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">คงเหลือค้างชำระ:</span>
                  <span className={`font-bold text-sm ${(table.remaining_balance || 0) > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {(table.remaining_balance || 0).toLocaleString()} บาท
                  </span>
                </div>

                {table.slip_url && (
                  <div className="pt-2 border-t border-slate-200">
                    <a
                      href={table.slip_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ดูรูปภาพสลิปที่แนบมา</span>
                    </a>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS: EDIT & DELETE & PAYMENT */}
              <div className="space-y-3 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span>จัดการการจองโต๊ะนี้</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isEditing ? 'ปิดหน้าจอแก้ไข' : '✏️ แก้ไขข้อมูล / ย้ายโต๊ะ'}</span>
                  </button>
                </div>

                {/* Quick Payment Status Switcher */}
                <div className="bg-slate-100 p-2.5 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600">
                    ปรับเปลี่ยนสถานะการชำระเงิน:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment('unpaid')}
                      disabled={loading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        table.payment_status === 'unpaid'
                          ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      ยังไม่จ่าย
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment('deposit_paid')}
                      disabled={loading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        table.payment_status === 'deposit_paid'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      🟡 มัดจำแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment('fully_paid')}
                      disabled={loading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        table.payment_status === 'fully_paid'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      🟢 จ่ายครบ 100%
                    </button>
                  </div>
                </div>

                {/* EDIT FORM (Visible when isEditing is true) */}
                {isEditing && (
                  <div className="bg-blue-50/60 p-3.5 sm:p-4 rounded-2xl border border-blue-200 space-y-3 text-xs animate-in fade-in zoom-in-95">
                    <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                      <span>แบบฟอร์มแก้ไขข้อมูลผู้จอง</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        ชื่อผู้จอง <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">รุ่น / ห้อง / สังกัด</label>
                      <input
                        type="text"
                        value={editBatch}
                        onChange={(e) => setEditBatch(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                        <span>ย้ายโต๊ะ (เฉพาะโต๊ะที่ว่างในระบบ)</span>
                      </label>
                      <select
                        value={targetTableNum}
                        onChange={(e) => setTargetTableNum(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value={table.table_number}>
                          โต๊ะปัจจุบัน (#{table.table_number} แถว {table.row_label})
                        </option>
                        {availableTables.map(t => (
                          <option key={t.table_number} value={t.table_number}>
                            ย้ายไปโต๊ะ #{t.table_number} (แถว {t.row_label})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขข้อมูล'}</span>
                    </button>
                  </div>
                )}

                {/* DELETE / CANCEL RESERVATION BUTTON */}
                <button
                  type="button"
                  onClick={handleDeleteReservation}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>ยกเลิก / ลบการจองนี้ (คืนสถานะเป็นโต๊ะว่าง)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

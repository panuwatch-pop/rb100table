'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shirt, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Truck, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Ruler,
  X
} from 'lucide-react';
import { ShirtType, ShirtOrderItem } from '@/lib/db';

interface ShirtShopProps {
  onBackToMap: () => void;
}

export default function ShirtShop({ onBackToMap }: ShirtShopProps) {
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([]);
  const [shippingFee, setShippingFee] = useState(50);
  const [promptpayNumber, setPromptpayNumber] = useState('');
  const [promptpayName, setPromptpayName] = useState('');
  const [loading, setLoading] = useState(true);

  // Active view per shirt type (id -> 'front' | 'back')
  const [activeViews, setActiveViews] = useState<Record<number, 'front' | 'back'>>({});

  // Cart: Map of key `${shirt_type_id}-${size}` -> { shirt_type_id, shirt_name, size, quantity, unit_price }
  const [cartItems, setCartItems] = useState<Record<string, {
    shirt_type_id: number;
    shirt_name: string;
    size: string;
    quantity: number;
    unit_price: number;
  }>>({});

  // Size chart modal
  const [showSizeChart, setShowSizeChart] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBatch, setCustomerBatch] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'unpaid' | 'paid'>('paid');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Modal State
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const ALL_SIZES = ['M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

  // Fetch shirt types from API
  useEffect(() => {
    fetch('/api/shirts')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setShirtTypes(json.data.shirt_types || []);
          setShippingFee(json.data.shipping_fee || 50);
          setPromptpayNumber(json.data.promptpay_number || '');
          setPromptpayName(json.data.promptpay_name || '');

          // Initialize view to front
          const initialViews: Record<number, 'front' | 'back'> = {};
          (json.data.shirt_types || []).forEach((s: ShirtType) => {
            initialViews[s.id] = 'front';
          });
          setActiveViews(initialViews);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Toggle front/back image view
  const setShirtView = (shirtId: number, view: 'front' | 'back') => {
    setActiveViews(prev => ({ ...prev, [shirtId]: view }));
  };

  // Cart operations
  const updateQuantity = (shirt: ShirtType, size: string, delta: number) => {
    const key = `${shirt.id}-${size}`;
    setCartItems(prev => {
      const current = prev[key];
      const newQty = (current ? current.quantity : 0) + delta;

      if (newQty <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: {
          shirt_type_id: shirt.id,
          shirt_name: shirt.name,
          size,
          quantity: newQty,
          unit_price: shirt.price
        }
      };
    });
  };

  const getQuantityForSize = (shirtId: number, size: string) => {
    const key = `${shirtId}-${size}`;
    return cartItems[key]?.quantity || 0;
  };

  const totalShirtCount = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
  const shirtsSubtotal = Object.values(cartItems).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const finalShippingFee = deliveryType === 'delivery' && totalShirtCount > 0 ? shippingFee : 0;
  const grandTotal = shirtsSubtotal + finalShippingFee;

  // Slip change
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalShirtCount === 0) {
      setErrorMsg('กรุณาเลือกไซส์และจำนวนเสื้ออย่างน้อย 1 ตัว');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('กรุณาระบุชื่อผู้สั่งและเบอร์โทรศัพท์ให้ครบถ้วน');
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      setErrorMsg('กรุณาระบุที่อยู่สำหรับจัดส่งพัสดุ');
      return;
    }

    setIsSubmitting(true);

    try {
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

      const itemsPayload: ShirtOrderItem[] = Object.values(cartItems).map(it => ({
        shirt_type_id: it.shirt_type_id,
        shirt_name: it.shirt_name,
        size: it.size,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.quantity * it.unit_price
      }));

      const res = await fetch('/api/shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_batch: customerBatch.trim() || null,
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'delivery' ? deliveryAddress.trim() : null,
          shipping_fee: finalShippingFee,
          items: itemsPayload,
          payment_status: paymentChoice,
          slip_url: uploadedSlipUrl,
          note: note.trim() || null
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'บันทึกการสั่งจองเสื้อไม่สำเร็จ');
      }

      setSuccessOrder(data.data.order);
      setQrCodeUrl(data.data.qr_code_url || null);
      setCartItems({});
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-5 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>สั่งจองเสื้อรุ่นที่ระลึก 100 ปี</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              สั่งจองเสื้อรุ่น คืนสู่เหย้า 100 ปี
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              มีให้เลือกทั้งแบบเสื้อโปโลพรีเมียม และเสื้อยืดคอกลมคลาสสิก • ไซส์ M, L, XL, 2XL, 3XL, 4XL, 5XL ราคาเดียวทุกไซส์
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSizeChart(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
            >
              <Ruler className="w-4 h-4 text-amber-400" />
              <span>ดูตารางไซส์</span>
            </button>
            <button
              type="button"
              onClick={onBackToMap}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              กลับไปผังโต๊ะ
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">กำลังโหลดข้อมูลเสื้อรุ่น...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: Shirt Catalog Cards */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shirt className="w-5 h-5 text-blue-600" />
                <span>เลือกแบบเสื้อและไซส์ที่ต้องการ</span>
              </h2>
              <span className="text-xs text-slate-500">เลือกสั่งได้มากกว่า 1 แบบและหลายไซส์</span>
            </div>

            {shirtTypes.map(shirt => {
              const currentView = activeViews[shirt.id] || 'front';
              const displayImg = currentView === 'front' ? shirt.image_front : (shirt.image_back || shirt.image_front);

              return (
                <div 
                  key={shirt.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Shirt Image with Front/Back Switcher */}
                    <div className="sm:col-span-5 bg-slate-50 rounded-2xl p-2 border border-slate-100 flex flex-col items-center justify-center relative">
                      <div className="w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={displayImg} 
                          alt={shirt.name}
                          className="w-full h-full object-contain drop-shadow-sm transition-all duration-300"
                        />
                      </div>

                      {/* 2-Image View Switcher Button Group */}
                      <div className="mt-2 flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setShirtView(shirt.id, 'front')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            currentView === 'front'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ภาพด้านหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setShirtView(shirt.id, 'back')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            currentView === 'back'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ภาพด้านหลัง
                        </button>
                      </div>
                    </div>

                    {/* Shirt Info & Size Selection */}
                    <div className="sm:col-span-7 space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                            {shirt.name}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-black text-blue-700">
                            {shirt.price.toLocaleString()} บาท
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ราคาเดียวทุกไซส์
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {shirt.description}
                        </p>
                      </div>

                      {/* Size Matrix with +/- Selector */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span>เลือกไซส์และจำนวน (M - 5XL):</span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                          {ALL_SIZES.map(size => {
                            const qty = getQuantityForSize(shirt.id, size);
                            const isSelected = qty > 0;

                            return (
                              <div
                                key={size}
                                className={`rounded-xl border p-1.5 text-center transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <span className="font-extrabold text-xs text-slate-800">{size}</span>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {qty > 0 ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(shirt, size, -1)}
                                        className="w-5 h-5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-5 text-center font-bold text-blue-700 text-xs">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(shirt, size, 1)}
                                        className="w-5 h-5 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(shirt, size, 1)}
                                      className="w-full py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[11px] font-semibold transition-all cursor-pointer"
                                    >
                                      + เลือก
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT 5 COLS: Cart & Checkout Form */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">สรุปคำสั่งจองเสื้อ</h2>
                    <p className="text-[11px] text-slate-500">เลือกเสื้อแล้ว {totalShirtCount} ตัว</p>
                  </div>
                </div>

                {totalShirtCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems({})}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    ล้างรายการ
                  </button>
                )}
              </div>

              {/* Items in Cart */}
              {totalShirtCount === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <Shirt className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700">ยังไม่มีเสื้อในรายการ</p>
                  <p className="text-[11px] text-slate-400">กรุณากดเลือกไซส์และจำนวนเสื้อด้านซ้าย</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {Object.entries(cartItems).map(([key, item]) => (
                    <div key={key} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1">{item.shirt_name}</div>
                        <div className="text-[11px] text-slate-500">
                          ไซส์ <strong className="text-blue-700">{item.size}</strong> • {item.unit_price} บ. x {item.quantity} ตัว
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">
                          {(item.unit_price * item.quantity).toLocaleString()} บ.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...cartItems };
                            delete next[key];
                            setCartItems(next);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Delivery Selection */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  วิธีการรับเสื้อ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      deliveryType === 'pickup'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>รับเองหน้างาน</span>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-bold mt-1">ฟรีค่าจัดส่ง</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      deliveryType === 'delivery'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>จัดส่งพัสดุ</span>
                    </div>
                    <div className="text-[11px] text-indigo-600 font-bold mt-1">+ ค่าส่ง {shippingFee} บ.</div>
                  </button>
                </div>

                {deliveryType === 'delivery' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      ที่อยู่จัดส่งพัสดุ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="ระบุบ้านเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    ></textarea>
                  </div>
                )}
              </div>

              {/* Orderer Contact Info */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812345678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">รุ่น / ห้อง / สังกัด</label>
                    <input
                      type="text"
                      value={customerBatch}
                      onChange={(e) => setCustomerBatch(e.target.value)}
                      placeholder="เช่น ม.6/2 รุ่น 45"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="เช่น ฝากไว้กับเพื่อน"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Choice */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <label className="block font-bold text-slate-800">
                  รูปแบบการสั่งซื้อ / ชำระเงิน <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: ซื้อเลย (ชำระเงินทันที) */}
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('paid')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'paid'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-extrabold">
                      <span>💳 ซื้อเลย (ชำระทันที)</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5 leading-tight">
                      สแกนจ่ายผ่าน PromptPay QR ทันที
                    </div>
                  </button>

                  {/* Option 2: จองไว้ก่อน (ชำระเงินภายหลัง) */}
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('unpaid')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentChoice === 'unpaid'
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-amber-950 font-extrabold">
                      <span>📝 จองไว้ก่อน</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      ระบุไซส์ไว้ก่อน ชำระเงินภายหลัง
                    </div>
                  </button>
                </div>

                {paymentChoice === 'paid' && (
                  <div className="mt-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
                    <label className="block font-semibold text-emerald-900 text-[11px]">
                      แนบสลิปโอนเงิน (ถ้ามี หรือสแกน QR ในขั้นตอนถัดไป)
                    </label>
                    <label className="border border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg p-2.5 flex items-center justify-center gap-2 cursor-pointer bg-white text-xs text-slate-600">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{slipFile ? slipFile.name : 'เลือกรูปสลิป'}</span>
                      <input type="file" accept="image/*" onChange={handleSlipChange} className="hidden" />
                    </label>
                    {slipPreview && (
                      <div className="text-center pt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slipPreview} alt="Slip" className="w-24 h-24 object-cover mx-auto rounded border" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>ค่าเสื้อรวม ({totalShirtCount} ตัว):</span>
                  <span>{shirtsSubtotal.toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ค่าจัดส่งพัสดุ:</span>
                  <span>{finalShippingFee > 0 ? `${finalShippingFee} บาท` : 'ฟรี (0 บาท)'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>ยอดสุทธิที่ต้องชำระ:</span>
                  <span className="text-lg text-blue-700">{grandTotal.toLocaleString()} บาท</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || totalShirtCount === 0}
                className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? 'กำลังประมวลผลคำสั่งซื้อ...'
                  : paymentChoice === 'paid'
                  ? `💳 ยืนยันการสั่งซื้อและชำระเงิน (${grandTotal.toLocaleString()} บาท)`
                  : `📝 ยืนยันการจองเสื้อรุ่น (ชำระภายหลัง ${grandTotal.toLocaleString()} บาท)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIZE CHART MODAL */}
      {showSizeChart && (
        <div 
          onClick={() => setShowSizeChart(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">ตารางขนาดไซส์เสื้อ (Size Chart)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeChart(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              * ขนาดเสื้ออาจมีความคลาดเคลื่อนประมาณ +/- 1 นิ้ว จากกระบวนการตัดเย็บ • ทุกไซส์ราคาเดียวไม่มีบวกเพิ่ม
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">ไซส์ (Size)</th>
                    <th className="py-2.5 px-3">รอบอก (นิ้ว)</th>
                    <th className="py-2.5 px-3">ความยาว (นิ้ว)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr><td className="py-2 font-bold text-blue-700">M</td><td>38"</td><td>27"</td></tr>
                  <tr className="bg-slate-50/50"><td className="py-2 font-bold text-blue-700">L</td><td>40"</td><td>28"</td></tr>
                  <tr><td className="py-2 font-bold text-blue-700">XL</td><td>42"</td><td>29"</td></tr>
                  <tr className="bg-slate-50/50"><td className="py-2 font-bold text-blue-700">2XL</td><td>44"</td><td>30"</td></tr>
                  <tr><td className="py-2 font-bold text-blue-700">3XL</td><td>46"</td><td>31"</td></tr>
                  <tr className="bg-slate-50/50"><td className="py-2 font-bold text-blue-700">4XL</td><td>48"</td><td>32"</td></tr>
                  <tr><td className="py-2 font-bold text-blue-700">5XL</td><td>50"</td><td>33"</td></tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setShowSizeChart(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {successOrder.payment_status === 'paid' 
                  ? '🎉 สั่งซื้อเสื้อรุ่นและบันทึกการชำระเงินสำเร็จ!' 
                  : '📝 บันทึกการจองเสื้อรุ่นสำเร็จเรียบร้อยแล้ว!'}
              </h3>
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-mono text-xs font-bold border border-blue-200">
                รหัสออเดอร์: {successOrder.order_code}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้สั่ง:</span>
                <span className="font-bold text-slate-800">{successOrder.customer_name} ({successOrder.customer_phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">การรับเสื้อ:</span>
                <span className="font-semibold text-slate-700">
                  {successOrder.delivery_type === 'delivery' ? `จัดส่งพัสดุ: ${successOrder.delivery_address}` : 'รับเองหน้างานเลี้ยงรุ่น'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนเสื้อรวม:</span>
                <span className="font-bold text-slate-800">{successOrder.total_quantity} ตัว</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-700">ยอดเงินรวม:</span>
                <span className="font-extrabold text-blue-700">{successOrder.total_price.toLocaleString()} บาท</span>
              </div>
            </div>

            {/* PromptPay QR Code if paid */}
            {qrCodeUrl && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-2">
                <div className="font-bold text-blue-900 text-xs flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-700" />
                  <span>สแกน QR Code พร้อมเพย์เพื่อชำระเงิน</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="PromptPay QR" className="w-40 h-40 mx-auto rounded-xl border bg-white p-1" />
                <p className="text-[11px] text-slate-500">
                  พร้อมเพย์: {promptpayNumber} {promptpayName ? `(${promptpayName})` : ''}
                </p>
              </div>
            )}

            <p className="text-[11px] text-center text-slate-400">
              ระบบส่งการแจ้งเตือนเข้ากลุ่ม LINE เรียบร้อยแล้วครับ
            </p>

            <button
              type="button"
              onClick={() => setSuccessOrder(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

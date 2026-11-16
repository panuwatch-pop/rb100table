'use client';

import React, { useState, useEffect } from 'react';
import { TableItem } from '@/lib/db';
import { APP_VERSION } from '@/config/version';
import { formatThaiDateTime } from '@/lib/date';
import ShirtModelsManager from '@/components/ShirtModelsManager';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  User, 
  DollarSign, 
  Download, 
  Settings, 
  Bell, 
  Send, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Table as TableIcon,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  Shirt,
  Truck,
  MapPin,
  Eye,
  Package,
  Camera,
  PlusCircle,
  Save,
  Database,
  UploadCloud,
  QrCode
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  tables: TableItem[];
  stats: {
    total_tables: number;
    available_tables: number;
    reserved_tables: number;
    paid_tables: number;
    total_deposit_collected: number;
    total_remaining_balance: number;
    total_booking_value: number;
  };
  onSelectTableForEdit: (table: TableItem) => void;
  onRefreshData: () => void;
}

export default function AdminModal({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
  tables,
  stats,
  onSelectTableForEdit,
  onRefreshData
}: AdminModalProps) {
  // Login Form
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('reunion_admin_user');
      if (savedUser) setUsername(savedUser);
    }
  }, []);

  // Tab
  const [activeTab, setActiveTab] = useState<'reservations' | 'shirts' | 'settings'>('reservations');

  // Shirt Orders State
  const [shirtOrders, setShirtOrders] = useState<any[]>([]);
  const [shirtSummary, setShirtSummary] = useState<{
    total_orders: number;
    total_shirts: number;
    total_revenue: number;
    total_sales?: number;
    size_summary: Record<string, number>;
    size_breakdown?: Record<string, number>;
  }>({
    total_orders: 0,
    total_shirts: 0,
    total_revenue: 0,
    total_sales: 0,
    size_summary: {},
    size_breakdown: {}
  });
  const [shirtLoading, setShirtLoading] = useState(false);
  const [shirtSearchQuery, setShirtSearchQuery] = useState('');
  const [shirtSubTab, setShirtSubTab] = useState<'orders' | 'models'>('orders');
  const [adminShirtTypes, setAdminShirtTypes] = useState<any[]>([]);
  const [shirtTypesLoading, setShirtTypesLoading] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

  // Manual Shirt Order Modal State & CSV Import
  const [showManualShirtModal, setShowManualShirtModal] = useState(false);
  const [manualShirtForm, setManualShirtForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_batch: '',
    delivery_type: 'pickup' as 'pickup' | 'delivery',
    delivery_address: '',
    shirt_type_id: 1,
    shirt_name: 'เสื้อโปโล สำหรับงาน 2 มีนาคม 2570 (Polo Premium)',
    size: 'L',
    quantity: 1,
    unit_price: 300,
    payment_status: 'paid' as 'unpaid' | 'paid',
    note: ''
  });
  const [manualShirtSubmitting, setManualShirtSubmitting] = useState(false);
  const [shirtImportLoading, setShirtImportLoading] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lineTestLoading, setLineTestLoading] = useState(false);
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  // Filter reservations & tables
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [tableFilterMode, setTableFilterMode] = useState<'reserved' | 'all'>('reserved');

  const fetchShirtOrders = async () => {
    setShirtLoading(true);
    try {
      const res = await fetch(`/api/admin/shirts/orders?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setShirtOrders(data.data.orders || []);
        const s = data.data.summary || {};
        setShirtSummary({
          total_orders: s.total_orders || 0,
          total_shirts: s.total_shirts || 0,
          total_revenue: s.total_revenue || s.total_sales || 0,
          size_summary: s.size_summary || s.size_breakdown || {}
        });
      }
    } catch (err) {
      console.error('Fetch shirt orders error:', err);
    } finally {
      setShirtLoading(false);
    }
  };

  const fetchShirtTypesAdmin = async () => {
    setShirtTypesLoading(true);
    try {
      const res = await fetch(`/api/admin/shirts/types?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAdminShirtTypes(data.data.shirt_types || []);
      }
    } catch (err) {
      console.error('Fetch shirt types error:', err);
    } finally {
      setShirtTypesLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && isOpen && activeTab === 'shirts') {
      fetchShirtOrders();
      fetchShirtTypesAdmin();
    }
  }, [isAdmin, isOpen, activeTab]);

  const handleUploadShirtImage = async (shirtId: number, side: 'front' | 'back', file: File) => {
    const key = `${shirtId}-${side}`;
    setUploadingImageKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'shirts');
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const upData = await upRes.json();
      if (!upData.success) throw new Error(upData.error || 'อัปโหลดรูปภาพไม่สำเร็จ');

      const updatePayload = side === 'front' ? { image_front: upData.url } : { image_back: upData.url };
      const res = await fetch(`/api/admin/shirts/types/${shirtId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      fetchShirtTypesAdmin();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImageKey(null);
    }
  };

  const handleSaveShirtModel = async (shirtId: number, name: string, price: number, description: string, isActive: number) => {
    try {
      const res = await fetch(`/api/admin/shirts/types/${shirtId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, description, is_active: isActive })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert('บันทึกข้อมูลแบบเสื้อเรียบร้อยแล้ว');
      fetchShirtTypesAdmin();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreateShirtModel = async () => {
    const name = prompt('กรอกชื่อแบบเสื้อรุ่นใหม่:');
    if (!name || !name.trim()) return;
    const priceStr = prompt('กำหนดราคาเสื้อ (บาท):', '350');
    if (!priceStr) return;
    const price = parseInt(priceStr, 10);
    if (isNaN(price) || price <= 0) {
      alert('กรุณาระบุราคาตัวเลขที่ถูกต้อง');
      return;
    }

    try {
      const res = await fetch('/api/admin/shirts/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert('เพิ่มแบบเสื้อรุ่นใหม่เรียบร้อยแล้ว คุณสามารถอัปโหลดรูปภาพได้ทันที');
      fetchShirtTypesAdmin();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteShirtModel = async (shirtId: number, shirtName: string) => {
    if (!confirm(`คุณต้องการลบแบบเสื้อ "${shirtName}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/shirts/types/${shirtId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchShirtTypesAdmin();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleUpdateShirtStatus = async (orderId: number, status: string, paymentStatus?: string) => {
    try {
      const res = await fetch(`/api/admin/shirts/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: status, payment_status: paymentStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchShirtOrders();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleCancelShirtOrder = async (orderId: number) => {
    if (!confirm(`คุณต้องการยกเลิกคำสั่งซื้อเสื้อ #${orderId} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/shirts/orders/${orderId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchShirtOrders();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleExportShirtCSV = () => {
    if (shirtOrders.length === 0) {
      alert('ยังไม่มีข้อมูลออเดอร์เสื้อรุ่นให้ดาวน์โหลด');
      return;
    }

    const headers = [
      'รหัสคำสั่งซื้อ',
      'ชื่อผู้สั่ง',
      'เบอร์โทรศัพท์',
      'รุ่น/ศิษย์เก่า',
      'วิธีรับสินค้า',
      'ที่อยู่จัดส่ง',
      'รายการสินค้าและไซส์',
      'จำนวนรวม (ตัว)',
      'ค่าจัดส่ง (บาท)',
      'ยอดเงินรวม (บาท)',
      'สถานะการชำระเงิน',
      'สถานะออเดอร์',
      'หมายเหตุ',
      'วันที่สั่งซื้อ'
    ];

    const rows = shirtOrders.map(o => {
      const itemsStr = (o.items || []).map((it: any) => `${it.shirt_name} (${it.size}) x${it.quantity}`).join('; ');
      return [
        o.order_code,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${o.customer_phone || ''}"`,
        `"${(o.customer_batch || '').replace(/"/g, '""')}"`,
        o.delivery_type === 'delivery' ? 'จัดส่งพัสดุ' : 'รับหน้างาน',
        `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        o.total_quantity,
        o.shipping_fee || 0,
        o.total_price,
        o.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระเงิน',
        o.order_status === 'delivered' ? 'ส่งมอบแล้ว' : o.order_status === 'shipped' ? 'จัดส่งแล้ว' : o.order_status === 'cancelled' ? 'ยกเลิกแล้ว' : 'รอดำเนินการ',
        `"${(o.note || '').replace(/"/g, '""')}"`,
        `"${o.created_at ? formatThaiDateTime(o.created_at) : '-'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานออเดอร์เสื้อรุ่น_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualShirtForm.customer_name.trim() || !manualShirtForm.customer_phone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }
    setManualShirtSubmitting(true);
    try {
      const selectedType = adminShirtTypes.find(t => t.id === Number(manualShirtForm.shirt_type_id)) || adminShirtTypes[0];
      const shirtName = selectedType ? selectedType.name : manualShirtForm.shirt_name;
      const unitPrice = selectedType ? selectedType.price : 300;
      const qty = Number(manualShirtForm.quantity) || 1;

      const payload = {
        customer_name: manualShirtForm.customer_name.trim(),
        customer_phone: manualShirtForm.customer_phone.trim(),
        customer_batch: manualShirtForm.customer_batch.trim(),
        delivery_type: manualShirtForm.delivery_type,
        delivery_address: manualShirtForm.delivery_address.trim(),
        payment_status: manualShirtForm.payment_status,
        note: manualShirtForm.note.trim() ? `[แอดมินบันทึก] ${manualShirtForm.note.trim()}` : '[แอดมินบันทึก]',
        items: [
          {
            shirt_type_id: Number(manualShirtForm.shirt_type_id),
            shirt_name: shirtName,
            size: manualShirtForm.size,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: qty * unitPrice
          }
        ]
      };

      const res = await fetch('/api/shirts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'บันทึกออเดอร์ไม่สำเร็จ');

      alert('บันทึกออเดอร์เสื้อรุ่นสำเร็จ!');
      setShowManualShirtModal(false);
      setManualShirtForm({
        customer_name: '',
        customer_phone: '',
        customer_batch: '',
        delivery_type: 'pickup',
        delivery_address: '',
        shirt_type_id: 1,
        shirt_name: 'เสื้อโปโล สำหรับงาน 2 มีนาคม 2570 (Polo Premium)',
        size: 'L',
        quantity: 1,
        unit_price: 300,
        payment_status: 'paid',
        note: ''
      });
      fetchShirtOrders();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกออเดอร์');
    } finally {
      setManualShirtSubmitting(false);
    }
  };

  const handleImportShirtCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`คุณต้องการนำเข้าออเดอร์เสื้อจากไฟล์ "${file.name}" ใช่หรือไม่?`)) {
      e.target.value = '';
      return;
    }

    setShirtImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/backup/import-shirts-csv', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'นำเข้าข้อมูลไม่สำเร็จ');

      alert(data.message || 'นำเข้าออเดอร์เสื้อเรียบร้อยแล้ว!');
      fetchShirtOrders();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ CSV');
    } finally {
      setShirtImportLoading(false);
      e.target.value = '';
    }
  };

  // Fetch settings, shirt types, and shirt orders when logged in
  useEffect(() => {
    if (isAdmin && isOpen) {
      fetchShirtTypesAdmin();
      fetchShirtOrders();
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setSettings(data.settings);
          }
        })
        .catch(console.error);
    }
  }, [isAdmin, isOpen]);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');

      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('reunion_admin_user', username);
      }

      setPassword('');
      onLoginSuccess();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    onLogout();
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSettingsMsg({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว!' });
      onRefreshData();
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Test LINE Connection
  const handleTestLine = async () => {
    setLineTestLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_line' })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSettingsMsg({ type: 'success', text: data.message || 'ส่งข้อความทดสอบเข้ากลุ่ม LINE สำเร็จแล้ว! 🎉' });
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setLineTestLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'หมายเลขโต๊ะ',
      'แถว',
      'สถานะ',
      'ชื่อผู้จอง',
      'เบอร์โทร',
      'รุ่น/ห้อง',
      'ยอดค่าโต๊ะ',
      'มัดจำที่ชำระแล้ว',
      'คงเหลือค้างชำระ',
      'สถานะการชำระ',
      'หมายเหตุ',
      'วันที่จอง'
    ];

    const rows = tables.map(t => [
      t.table_number,
      t.row_label,
      t.status === 'PAID' ? 'ชำระครบ' : t.status === 'RESERVED' ? 'มัดจำแล้ว' : 'ว่าง',
      t.booker_name || '',
      t.booker_phone || '',
      t.booker_batch || '',
      t.price,
      t.deposit_paid || 0,
      t.remaining_balance || 0,
      t.payment_status || 'unpaid',
      `"${(t.note || '').replace(/"/g, '""')}"`,
      `"${t.created_at ? formatThaiDateTime(t.created_at) : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานการจองโต๊ะ_งานเลี้ยงรุ่น_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download complete SQLite DB backup
  const handleDownloadDbBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/admin/backup/db');
      if (!res.ok) throw new Error('ดาวน์โหลดไฟล์ฐานข้อมูลไม่สำเร็จ');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reunion-backup-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดฐานข้อมูล');
    } finally {
      setBackupLoading(false);
    }
  };

  // Import and restore reservations from CSV
  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`คุณต้องการนำเข้าและกู้คืนข้อมูลการจองโต๊ะจากไฟล์ "${file.name}" ใช่หรือไม่?\n(โต๊ะที่ระบุในไฟล์จะถูกอัปเดตสถานะและข้อมูลผู้จองตามไฟล์ CSV ทันที)`)) {
      e.target.value = '';
      return;
    }

    try {
      setImportLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/backup/import-csv', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'นำเข้าข้อมูลไม่สำเร็จ');

      alert(`✅ ${data.message}`);
      onRefreshData();
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  // Upload custom QR Code image
  const handleUploadQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingQr(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'qr');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'อัปโหลดรูปไม่สำเร็จ');

      setSettings(prev => ({
        ...prev,
        promptpay_qr_image: data.url
      }));
      alert('อัปโหลดรูปภาพ QR Code สำเร็จ! กรุณากดปุ่ม "บันทึกการตั้งค่าทั้งหมด" ด้านล่างเพื่อยืนยันการใช้งาน');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูป');
    } finally {
      setUploadingQr(false);
      e.target.value = '';
    }
  };

  // Bulk update table prices
  const handleBulkUpdatePrice = async () => {
    const price = Number(settings.table_default_price);
    const deposit = Number(settings.table_default_deposit);
    if (!price || price <= 0) {
      alert('กรุณาระบุราคาค่าโต๊ะที่มากกว่า 0 บาท');
      return;
    }
    if (!confirm(`คุณต้องการปรับราคาโต๊ะที่ "ว่าง" ทั้งหมด เป็น ${price.toLocaleString()} บาท (มัดจำ ${deposit.toLocaleString()} บาท) ใช่หรือไม่?`)) {
      return;
    }

    setBulkPriceLoading(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/admin/tables/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apply_to_all_available: true,
          price,
          deposit_amount: deposit
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSettingsMsg({ type: 'success', text: data.message });
      onRefreshData();
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message });
    } finally {
      setBulkPriceLoading(false);
    }
  };

  // Edit single table price
  const handleEditTablePrice = async (tableNumber: number, currentPrice: number, currentDeposit: number) => {
    const inputPrice = prompt(`กำหนดราคาใหม่สำหรับ โต๊ะ #${tableNumber} (บาท):`, String(currentPrice));
    if (inputPrice === null) return;
    const numPrice = parseInt(inputPrice, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert('กรุณาระบุราคาตัวเลขที่มากกว่า 0 บาท');
      return;
    }

    const inputDeposit = prompt(`กำหนดค่ามัดจำสำหรับ โต๊ะ #${tableNumber} (บาท):`, String(currentDeposit));
    const numDeposit = inputDeposit ? parseInt(inputDeposit, 10) : undefined;

    try {
      const res = await fetch('/api/admin/tables/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          price: numPrice,
          deposit_amount: numDeposit
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert(data.message);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cancel single reservation by Admin
  const handleCancelReservation = async (table: TableItem) => {
    if (!table.reservation_id) {
      alert(`ไม่พบรหัสการจองของโต๊ะ #${table.table_number}`);
      return;
    }

    const booker = table.booker_name ? `ของคุณ ${table.booker_name}` : '';
    if (!confirm(`คุณต้องการ "ยกเลิกการจอง" โต๊ะหมายเลข ${table.table_number} ${booker} ใช่หรือไม่?\n\nเมื่อยกเลิกแล้ว โต๊ะจะกลับมาเป็นสถานะ "ว่าง" ทันที`)) {
      return;
    }

    try {
      const res = await fetch(`/api/reservations/${table.reservation_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'ยกเลิกการจองไม่สำเร็จ');

      alert(`ยกเลิกการจองโต๊ะหมายเลข ${table.table_number} เรียบร้อยแล้ว`);
      onRefreshData();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const reservedTablesList = tables.filter(t => t.status !== 'AVAILABLE');
  const displayedTables = tableFilterMode === 'reserved' 
    ? reservedTablesList 
    : tables;

  const filteredReservations = displayedTables.filter(t => {
    if (!searchTableQuery) return true;
    const q = searchTableQuery.toLowerCase().trim();
    return (
      t.table_number.toString().includes(q) ||
      (t.booker_name && t.booker_name.toLowerCase().includes(q)) ||
      (t.booker_phone && t.booker_phone.includes(q)) ||
      (t.booker_batch && t.booker_batch.toLowerCase().includes(q)) ||
      (t.row_label && t.row_label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">แผงควบคุมระบบจัดงาน (Admin Portal)</h2>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">จัดการข้อมูลการจอง ยอดเงิน และการแจ้งเตือน LINE</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOT LOGGED IN -> SHOW LOGIN FORM */}
        {!isAdmin ? (
          <div className="p-6 sm:p-8 max-w-md mx-auto w-full space-y-5 my-auto">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">เข้าสู่ระบบผู้ดูแล</h3>
              <p className="text-xs text-slate-500">สำหรับคณะกรรมการจัดงานเพื่อบริหารจัดการโต๊ะ</p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านผู้ดูแล"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>จดจำการเข้าสู่ระบบ</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                {loginLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        ) : (
          /* LOGGED IN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats Cards Row */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดจองรวมทั้งงาน</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {stats.total_booking_value.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-slate-400">จองแล้ว {tables.length - stats.available_tables} / 107 โต๊ะ</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดมัดจำที่เก็บได้</span>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {stats.total_deposit_collected.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-emerald-600">เงินสดพร้อมใช้งาน</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-[11px]">ยอดคงเหลือค้างเก็บ</span>
                <div className="text-base font-bold text-amber-600 mt-0.5">
                  {stats.total_remaining_balance.toLocaleString()} บาท
                </div>
                <span className="text-[10px] text-amber-600">รอเก็บหน้างาน/งวดสอง</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-slate-500 text-[11px]">ดาวน์โหลดรายงาน / สำรอง</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs"
                    title="ดาวน์โหลดรายงานโต๊ะในรูปแบบ Excel CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDbBackup}
                    disabled={backupLoading}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
                    title="ดาวน์โหลดไฟล์ฐานข้อมูลจริง (.db) สำรองเก็บไว้"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{backupLoading ? '...' : '.DB'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('reservations')}
                  className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'reservations'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  <span>จัดการข้อมูลโต๊ะ ({displayedTables.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('shirts')}
                  className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'shirts'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Shirt className="w-4 h-4" />
                  <span>ออเดอร์เสื้อรุ่น ({shirtOrders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>ตั้งค่าระบบ & ราคา</span>
                </button>
              </div>

              {activeTab === 'reservations' && (
                <div className="flex items-center gap-2 py-1.5">
                  {/* Filter Toggle: Reserved vs All */}
                  <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTableFilterMode('reserved')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        tableFilterMode === 'reserved'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      จองแล้ว ({reservedTablesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableFilterMode('all')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        tableFilterMode === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      โต๊ะทั้งหมด ({tables.length})
                    </button>
                  </div>

                  <div className="relative w-40 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTableQuery}
                      onChange={(e) => setSearchTableQuery(e.target.value)}
                      placeholder="ค้นหาผู้จอง / เบอร์ / โต๊ะ..."
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'reservations' ? (
                /* TAB 1: RESERVATIONS & TABLES LIST */
                <div className="space-y-3">
                  {filteredReservations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      ยังไม่มีรายการโต๊ะในระบบ หรือไม่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th className="py-2.5 px-3">โต๊ะ</th>
                            <th className="py-2.5 px-3">สถานะ</th>
                            <th className="py-2.5 px-3">ราคาโต๊ะ</th>
                            <th className="py-2.5 px-3">ผู้จอง</th>
                            <th className="py-2.5 px-3">เบอร์โทร</th>
                            <th className="py-2.5 px-3">รุ่น/ห้อง</th>
                            <th className="py-2.5 px-3">ยอดชำระแล้ว</th>
                            <th className="py-2.5 px-3">คงเหลือ</th>
                            <th className="py-2.5 px-3">วันที่/เวลาจอง</th>
                            <th className="py-2.5 px-3 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReservations.map(t => (
                            <tr key={t.table_number} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                #{t.table_number} <span className="text-slate-400 text-[10px]">({t.row_label})</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : t.payment_status === 'unpaid'
                                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                      : t.status === 'RESERVED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {t.status === 'PAID' 
                                    ? 'ชำระครบ' 
                                    : t.payment_status === 'unpaid'
                                    ? 'จอง (ยังไม่มัดจำ)'
                                    : t.status === 'RESERVED' 
                                    ? 'มัดจำแล้ว' 
                                    : '🟢 ว่าง'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-blue-950">
                                {(t.price || 3000).toLocaleString()} บ.
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {t.booker_name || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {t.booker_phone || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {t.booker_batch || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600">
                                {t.status !== 'AVAILABLE' ? `${(t.deposit_paid || 0).toLocaleString()} บ.` : '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-rose-600">
                                {t.status !== 'AVAILABLE' ? `${(t.remaining_balance || 0).toLocaleString()} บ.` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                {t.status !== 'AVAILABLE' ? formatThaiDateTime(t.created_at) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {/* Edit table price button */}
                                  <button
                                    type="button"
                                    onClick={() => handleEditTablePrice(t.table_number, t.price, t.deposit_amount)}
                                    title="ตั้งราคาโต๊ะนี้"
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] transition-all cursor-pointer"
                                  >
                                    ✏️ ตั้งราคา
                                  </button>

                                  {/* If table is reserved, allow editing/moving booking & cancel */}
                                  {t.status !== 'AVAILABLE' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSelectTableForEdit(t);
                                          onClose();
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-all cursor-pointer"
                                      >
                                        แก้ไข / ย้าย
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelReservation(t)}
                                        title="ยกเลิกการจองโต๊ะนี้"
                                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                        <span>ยกเลิก</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : activeTab === 'shirts' ? (
                /* TAB 2: SHIRT ORDERS & MODELS MANAGEMENT */
                <div className="space-y-4">
                  {/* Shirt Sub-tabs: Orders vs Models & Pictures */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShirtSubTab('orders')}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          shirtSubTab === 'orders'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>รายการออเดอร์ ({shirtOrders?.length || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShirtSubTab('models')}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          shirtSubTab === 'models'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Shirt className="w-3.5 h-3.5" />
                        <span>จัดการแบบเสื้อและรูปภาพ ({adminShirtTypes?.length || 0})</span>
                      </button>
                    </div>

                    {shirtSubTab === 'orders' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowManualShirtModal(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>เพิ่มออเดอร์เสื้อ</span>
                        </button>

                        <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{shirtImportLoading ? 'กำลังนำเข้า...' : 'Import CSV เสื้อ'}</span>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleImportShirtCsv}
                            disabled={shirtImportLoading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {shirtSubTab === 'models' && (
                      <button
                        type="button"
                        onClick={handleCreateShirtModel}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>เพิ่มแบบเสื้อใหม่</span>
                      </button>
                    )}
                  </div>

                  {shirtSubTab === 'orders' ? (
                    <>
                      {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-slate-500 text-[11px]">ยอดคำสั่งซื้อทั้งหมด</span>
                      <div className="text-base font-bold text-indigo-700 mt-0.5">
                        {shirtSummary?.total_orders ?? 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-slate-500 text-[11px]">จำนวนเสื้อทั้งหมด</span>
                      <div className="text-base font-bold text-blue-700 mt-0.5">
                        {shirtSummary?.total_shirts ?? 0} ตัว
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-slate-500 text-[11px]">ยอดเงินรวมทั้งหมด</span>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">
                        {((shirtSummary?.total_revenue ?? shirtSummary?.total_sales) ?? 0).toLocaleString()} บาท
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <span className="text-slate-500 text-[11px]">ส่งออกข้อมูล</span>
                      <button
                        type="button"
                        onClick={handleExportShirtCSV}
                        className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV เสื้อ</span>
                      </button>
                    </div>
                  </div>

                  {/* Size Breakdown Card for Factory */}
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <span>สรุปยอดจำนวนเสื้อแยกตามไซส์ (สำหรับส่งโรงงานตัดเย็บ):</span>
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold">
                        รวมทั้งสิ้น {shirtSummary?.total_shirts ?? 0} ตัว
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map((sz) => (
                        <div
                          key={sz}
                          className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl shadow-2xs flex items-center gap-2"
                        >
                          <span className="font-bold text-slate-700 text-xs">{sz}</span>
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-xs">
                            {shirtSummary?.size_summary?.[sz] ?? shirtSummary?.size_breakdown?.[sz] ?? 0}
                          </span>
                          <span className="text-[10px] text-slate-400">ตัว</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search and Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72 text-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={shirtSearchQuery}
                        onChange={(e) => setShirtSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อ, เบอร์โทร, หรือรหัสออเดอร์..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchShirtOrders}
                      disabled={shirtLoading}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${shirtLoading ? 'animate-spin' : ''}`} />
                      <span>รีเฟรชข้อมูล</span>
                    </button>
                  </div>

                  {/* Orders Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-3">รหัสออเดอร์</th>
                            <th className="py-3 px-3">ผู้สั่งจอง</th>
                            <th className="py-3 px-3">การจัดส่ง</th>
                            <th className="py-3 px-3">รายการเสื้อ</th>
                            <th className="py-3 px-3 text-right">ยอดรวม</th>
                            <th className="py-3 px-3 text-center">สลิป</th>
                            <th className="py-3 px-3 text-center">ชำระเงิน</th>
                            <th className="py-3 px-3 text-center">สถานะออเดอร์</th>
                            <th className="py-3 px-3 text-center">วันที่/เวลาสั่ง</th>
                            <th className="py-3 px-3 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {shirtOrders
                            .filter((o) => {
                              if (!shirtSearchQuery) return true;
                              const q = shirtSearchQuery.toLowerCase();
                              return (
                                o.order_code?.toLowerCase().includes(q) ||
                                o.customer_name?.toLowerCase().includes(q) ||
                                o.customer_phone?.includes(q) ||
                                o.customer_batch?.toLowerCase().includes(q)
                              );
                            })
                            .map((o) => (
                              <tr key={o.id} className="hover:bg-slate-50/70 transition-all">
                                <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                  {o.order_code}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-900">{o.customer_name}</div>
                                  <div className="text-[11px] text-slate-500">{o.customer_phone}</div>
                                  {o.customer_batch && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600">
                                      รุ่น {o.customer_batch}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {o.delivery_type === 'delivery' ? (
                                    <div className="text-[11px]">
                                      <span className="font-bold text-blue-700 flex items-center gap-1">
                                        <Truck className="w-3 h-3" /> จัดส่งปลายทาง
                                      </span>
                                      <p className="text-slate-600 text-[10px] line-clamp-2 mt-0.5 max-w-[180px]">
                                        {o.delivery_address}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                                      <MapPin className="w-3 h-3" /> รับหน้างาน (ฟรี)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="space-y-1 max-w-[200px]">
                                    {(o.items || []).map((it: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-700 truncate pr-1">
                                          {it.shirt_name}
                                        </span>
                                        <span className="font-bold text-indigo-700 shrink-0">
                                          {it.size} x{it.quantity}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-100">
                                      รวม {o.total_quantity || 0} ตัว
                                      {(o.shipping_fee || 0) > 0 && ` • ค่าส่ง ${o.shipping_fee} บ.`}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-slate-900">
                                  {(o.total_price || 0).toLocaleString()} บ.
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {o.slip_url ? (
                                    <a
                                      href={o.slip_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] hover:bg-emerald-100"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>ดูสลิป</span>
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateShirtStatus(
                                        o.id,
                                        o.order_status,
                                        o.payment_status === 'paid' ? 'unpaid' : 'paid'
                                      )
                                    }
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                      o.payment_status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                                    }`}
                                  >
                                    {o.payment_status === 'paid' ? '✓ ชำระแล้ว' : '⏳ รอชำระ'}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <select
                                    value={o.order_status}
                                    onChange={(e) => handleUpdateShirtStatus(o.id, e.target.value)}
                                    className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 font-medium text-slate-700 outline-none"
                                  >
                                    <option value="pending">รอดำเนินการ</option>
                                    <option value="shipped">จัดส่งแล้ว</option>
                                    <option value="delivered">ส่งมอบแล้ว</option>
                                    <option value="cancelled">ยกเลิก</option>
                                  </select>
                                </td>
                                <td className="py-3 px-3 text-slate-500 text-center whitespace-nowrap text-[11px]">
                                  {formatThaiDateTime(o.created_at)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelShirtOrder(o.id)}
                                    title="ยกเลิกออเดอร์นี้"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {shirtOrders.length === 0 && (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                                ยังไม่มีรายการสั่งจองเสื้อรุ่น
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <ShirtModelsManager
                  shirtTypes={adminShirtTypes}
                  uploadingKey={uploadingImageKey}
                  onUploadImage={handleUploadShirtImage}
                  onSaveModel={handleSaveShirtModel}
                  onDeleteModel={handleDeleteShirtModel}
                  onRefresh={fetchShirtTypesAdmin}
                  loading={shirtTypesLoading}
                />
              )}
            </div>
          ) : (
                /* TAB 3: SETTINGS & CONFIGURATION */
                <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-4 text-xs">
                  {settingsMsg && (
                    <div
                      className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
                        settingsMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {settingsMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{settingsMsg.text}</span>
                    </div>
                  )}

                  {/* Section 1: Event Information */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">ชื่องานเลี้ยงและหัวเรื่อง</h4>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ชื่องาน (Event Title)</label>
                      <input
                        type="text"
                        value={settings.event_title || ''}
                        onChange={(e) => setSettings({ ...settings, event_title: e.target.value })}
                        placeholder="เช่น งานเลี้ยงรุ่นคืนสู่เหย้า ประจำปี"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">คำบรรยาย / สถานที่จัดงาน (Event Subtitle)</label>
                      <input
                        type="text"
                        value={settings.event_subtitle || ''}
                        onChange={(e) => setSettings({ ...settings, event_subtitle: e.target.value })}
                        placeholder="เช่น School Reunion Table Reservation • รวม 107 โต๊ะ"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 2: PromptPay & Bank Settings */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-slate-900 text-sm">ข้อมูลการรับเงินพร้อมเพย์และบัญชีธนาคาร (PromptPay & Bank QR)</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          เบอร์พร้อมเพย์ / เลขบัญชี
                        </label>
                        <input
                          type="text"
                          value={settings.promptpay_number || ''}
                          onChange={(e) => setSettings({ ...settings, promptpay_number: e.target.value })}
                          placeholder="เช่น 3101500616030 หรือ 0812345678"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">ชื่อบัญชีผู้รับเงิน</label>
                        <input
                          type="text"
                          value={settings.promptpay_name || ''}
                          onChange={(e) => setSettings({ ...settings, promptpay_name: e.target.value })}
                          placeholder="เช่น นาย ศุภชัย พร้อมจิตต์"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">ธนาคาร / รายละเอียด</label>
                        <input
                          type="text"
                          value={settings.promptpay_bank || ''}
                          onChange={(e) => setSettings({ ...settings, promptpay_bank: e.target.value })}
                          placeholder="เช่น ธนาคารกรุงไทย"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* QR Code Upload & Preview */}
                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 h-28 bg-white border border-slate-300 rounded-xl overflow-hidden p-1 shadow-xs shrink-0 flex items-center justify-center relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={settings.promptpay_qr_image || '/krungthai_qr.jpg'}
                          alt="QR Code Preview"
                          className="w-full h-full object-contain"
                        />
                        {uploadingQr && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center text-white text-[10px]">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 flex-1">
                        <div className="font-bold text-slate-800">รูปภาพ QR Code สำหรับโอนเงิน</div>
                        <p className="text-[11px] text-slate-500">
                          สามารถอัปโหลดรูปภาพ QR Code พร้อมเพย์ หรือรูป QR บัญชีธนาคารใบใหม่ได้ทันที ภาพนี้จะนำไปแสดงในหน้าจองโต๊ะและหน้าสั่งซื้อเสื้ออัตโนมัติ
                        </p>
                        <label className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-100 border border-blue-300 text-blue-700 rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-all">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{uploadingQr ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปภาพ QR Code'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingQr}
                            onChange={handleUploadQrImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Table Pricing & Default Deposit Configuration */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <h4 className="font-bold text-slate-900 text-sm">กำหนดราคาค่าโต๊ะและเงินมัดจำ (Table Pricing)</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      แอดมินสามารถตั้งราคาค่าโต๊ะมาตรฐาน และค่ามัดจำเริ่มต้นของระบบ รวมถึงสามารถกดปุ่มเพื่อปรับใช้ราคาใหม่นี้กับโต๊ะที่ยังว่างทั้งหมดในคราวเดียวได้ทันที
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          ราคาค่าโต๊ะมาตรฐาน (บาท)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.table_default_price || '3000'}
                          onChange={(e) => setSettings({ ...settings, table_default_price: e.target.value })}
                          placeholder="เช่น 3000"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          ค่ามัดจำเริ่มต้นมาตรฐาน (บาท)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.table_default_deposit || '1000'}
                          onChange={(e) => setSettings({ ...settings, table_default_deposit: e.target.value })}
                          placeholder="เช่น 1000"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/70">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          🌟 ราคาโปรโมชั่นค่าโต๊ะ Early Bird (บาท)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.early_bird_table_price || '7000'}
                          onChange={(e) => setSettings({ ...settings, early_bird_table_price: e.target.value })}
                          placeholder="เช่น 7000"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-amber-900"
                        />
                        <span className="text-[10px] text-slate-500">สำหรับแพ็กเกจโปรโมชั่นลดพิเศษ 7,000 บ.</span>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          📦 ค่าจัดส่งพัสดุสำหรับเสื้อรุ่น (บาท)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={settings.shirt_shipping_fee || '50'}
                          onChange={(e) => setSettings({ ...settings, shirt_shipping_fee: e.target.value })}
                          placeholder="เช่น 50"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                        <span className="text-[10px] text-slate-500">ค่าส่งกรณีเลือกจัดส่งถึงบ้าน (รับหน้างาน = 0 บ.)</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-900 font-medium">
                        ต้องการปรับราคาให้โต๊ะว่างทั้งหมดในระบบ ({stats.available_tables} โต๊ะ) ตอนนี้เลยหรือไม่?
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkUpdatePrice}
                        disabled={bulkPriceLoading}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${bulkPriceLoading ? 'animate-spin' : ''}`} />
                        <span>{bulkPriceLoading ? 'กำลังปรับราคา...' : '🔄 ปรับใช้กับโต๊ะว่างทั้งหมด'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 4: LINE Messaging API Notifications */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 text-sm">การแจ้งเตือนเข้า LINE Group อัตโนมัติ</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.line_notify_enabled === 'true'}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              line_notify_enabled: e.target.checked ? 'true' : 'false'
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      ระบบจะส่งการ์ด Flex Message แจ้งเตือนเข้ากลุ่ม LINE ทันทีที่มีการจองโต๊ะใหม่ หรือมีการอัปเดตการชำระเงิน
                    </p>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Channel Access Token (จาก LINE Developers Console)
                      </label>
                      <input
                        type="password"
                        value={settings.line_channel_access_token || ''}
                        onChange={(e) => setSettings({ ...settings, line_channel_access_token: e.target.value })}
                        placeholder="วาง Channel Access Token ที่นี่..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Group ID (ไอดีกลุ่มไลน์ที่เชิญบอทเข้าไป)
                      </label>
                      <input
                        type="text"
                        value={settings.line_group_id || ''}
                        onChange={(e) => setSettings({ ...settings, line_group_id: e.target.value })}
                        placeholder="เช่น C1234567890abcdef..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleTestLine}
                        disabled={lineTestLoading}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{lineTestLoading ? 'กำลังส่ง...' : 'ทดสอบส่งการ์ดเข้ากลุ่ม LINE'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 5: Database Backup & Emergency Recovery */}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-slate-900 text-sm">การสำรองฐานข้อมูลและการกู้คืนข้อมูล (Backup & Disaster Recovery)</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      แอดมินสามารถดาวน์โหลดไฟล์ฐานข้อมูลจริง (.db) สำรองเก็บไว้ในคอมพิวเตอร์ของคุณได้ตลอดเวลา และสามารถนำเข้าไฟล์ CSV รายงานการจองโต๊ะเพื่อกู้คืนสถานะโต๊ะทั้งหมดได้ทันที
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadDbBackup}
                        disabled={backupLoading}
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-indigo-300 text-indigo-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-indigo-600" />
                        <span>{backupLoading ? 'กำลังดาวน์โหลด...' : '📥 ดาวน์โหลดสำรองฐานข้อมูล (.db)'}</span>
                      </button>

                      <label className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-emerald-300 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center">
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        <span>{importLoading ? 'กำลังกู้คืน...' : '📤 นำเข้าและกู้คืนข้อมูลโต๊ะจาก CSV'}</span>
                        <input
                          type="file"
                          accept=".csv"
                          disabled={importLoading}
                          onChange={handleImportCsvFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    {settingsLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Manual Add Shirt Order Modal */}
        {showManualShirtModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">เพิ่มรายการออเดอร์เสื้อด้วยตนเอง</h3>
                    <p className="text-[11px] text-slate-500">สำหรับแอดมินบันทึกยอดสั่งจองจาก LINE / โทรสั่ง หรือกู้คืนข้อมูล</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualShirtModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้สั่งจอง *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมชาย ใจดี"
                      value={manualShirtForm.customer_name}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, customer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                    <input
                      type="tel"
                      required
                      placeholder="เช่น 0812345678"
                      value={manualShirtForm.customer_phone}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">รุ่น / ห้อง</label>
                    <input
                      type="text"
                      placeholder="เช่น 100, 107 ห้อง 5"
                      value={manualShirtForm.customer_batch}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, customer_batch: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">แบบเสื้อ</label>
                    <select
                      value={manualShirtForm.shirt_type_id}
                      onChange={e => {
                        const id = Number(e.target.value);
                        const sel = adminShirtTypes.find(t => t.id === id);
                        setManualShirtForm({
                          ...manualShirtForm,
                          shirt_type_id: id,
                          shirt_name: sel ? sel.name : manualShirtForm.shirt_name
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      {adminShirtTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (300 บาท)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ไซส์</label>
                    <select
                      value={manualShirtForm.size}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, size: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      {['M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">จำนวน (ตัว)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={manualShirtForm.quantity}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">วิธีรับสินค้า</label>
                    <select
                      value={manualShirtForm.delivery_type}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, delivery_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="pickup">รับเองหน้างาน (ฟรี)</option>
                      <option value="delivery">จัดส่งพัสดุ (+50 บาท)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">สถานะชำระเงิน</label>
                    <select
                      value={manualShirtForm.payment_status}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, payment_status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="paid">ชำระแล้ว (Paid)</option>
                      <option value="unpaid">รอชำระเงิน (Unpaid)</option>
                    </select>
                  </div>
                </div>

                {manualShirtForm.delivery_type === 'delivery' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ที่อยู่จัดส่งพัสดุ</label>
                    <textarea
                      rows={2}
                      placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      value={manualShirtForm.delivery_address}
                      onChange={e => setManualShirtForm({ ...manualShirtForm, delivery_address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <input
                    type="text"
                    placeholder="เช่น โอนเข้าบัญชีกรุงไทย, สั่งทางไลน์"
                    value={manualShirtForm.note}
                    onChange={e => setManualShirtForm({ ...manualShirtForm, note: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowManualShirtModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={manualShirtSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{manualShirtSubmitting ? 'กำลังบันทึก...' : 'บันทึกออเดอร์'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

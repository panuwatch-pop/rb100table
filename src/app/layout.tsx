import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบจองโต๊ะงานเลี้ยงรุ่น | School Reunion Table Reservation",
  description: "ระบบจองโต๊ะงานเลี้ยงรุ่น แผนผังโต๊ะ 107 โต๊ะ พร้อมระบบชำระเงินมัดจำและแจ้งเตือน Real-time ผ่าน LINE Group",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}

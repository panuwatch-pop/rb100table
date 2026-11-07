@echo off
title School Reunion Table Reservation System
set PATH=F:\Dev\nodejs;%PATH%
cd /d "F:\reunion-table-reservation"
echo ========================================================
echo   School Reunion Table Reservation System
echo   ระบบจองโต๊ะงานเลี้ยงรุ่น (ผังโต๊ะ 107 โต๊ะ)
echo   Drive F: F:\reunion-table-reservation
echo ========================================================
echo กำลังเริ่มต้นระบบ...
echo เข้าใช้งานได้ที่: http://localhost:3000
echo สำหรับมือถือ/แท็บเล็ตในวง Wi-Fi เดียวกัน ให้ใช้ IP เครื่องนี้
echo ========================================================
npm run dev -- -p 3000
pause

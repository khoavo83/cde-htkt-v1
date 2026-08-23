'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { formatDateVN, toInputDateFormat } from '@/lib/formatters';

/**
 * Component DatePickerVN chuẩn định dạng Việt Nam (DD/MM/YYYY)
 * - Luôn hiển thị định dạng DD/MM/YYYY trên giao diện (không bị trình duyệt ép về MM/DD/YYYY)
 * - Cho phép bấm icon Lịch để chọn ngày nhanh
 * - Cho phép nhập tay dạng DD/MM/YYYY (ví dụ: 24/06/2026 hoặc 24062026)
 * - Callback onChange(isoString) trả về YYYY-MM-DD
 */
export default function DatePickerVN({
  value = '',
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  disabled = false,
  required = false,
  id,
  name
}) {
  const [displayText, setDisplayText] = useState('');
  const hiddenDateInputRef = useRef(null);

  // Đồng bộ giá trị từ prop value (YYYY-MM-DD hoặc ISO hoặc DD/MM/YYYY) sang hiển thị DD/MM/YYYY
  useEffect(() => {
    if (!value) {
      setDisplayText('');
    } else {
      const formatted = formatDateVN(value);
      setDisplayText(formatted === '-' ? '' : formatted);
    }
  }, [value]);

  // Xử lý khi người dùng chọn ngày từ bộ chọn lịch native
  const handleNativeDateChange = (e) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      if (onChange) onChange(val);
      setDisplayText(formatDateVN(val));
    } else {
      if (onChange) onChange('');
      setDisplayText('');
    }
  };

  // Xử lý khi người dùng gõ tay vào ô text
  const handleTextChange = (e) => {
    let text = e.target.value;
    setDisplayText(text);

    // Nếu xóa hết
    if (!text.trim()) {
      if (onChange) onChange('');
      return;
    }

    // Tự động phân tích nếu đủ ngày tháng năm: DD/MM/YYYY hoặc DD-MM-YYYY
    const clean = text.trim();
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d && m && y && y.length === 4 && d.length <= 2 && m.length <= 2) {
        const day = parseInt(d, 10);
        const month = parseInt(m, 10);
        const year = parseInt(y, 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (onChange) onChange(iso);
        }
      }
    }
  };

  // Khi rời khỏi ô nhập, nếu không hợp lệ thì rollback hoặc chuẩn hóa
  const handleBlur = () => {
    if (!displayText.trim()) {
      if (onChange) onChange('');
      return;
    }
    const iso = toInputDateFormat(displayText);
    if (iso) {
      setDisplayText(formatDateVN(iso));
      if (onChange) onChange(iso);
    } else {
      // Nếu không parse được thì revert về value cũ
      setDisplayText(value ? formatDateVN(value) : '');
    }
  };

  // Mở popup lịch
  const openCalendar = () => {
    if (disabled) return;
    if (hiddenDateInputRef.current) {
      if (typeof hiddenDateInputRef.current.showPicker === 'function') {
        hiddenDateInputRef.current.showPicker();
      } else {
        hiddenDateInputRef.current.focus();
      }
    }
  };

  const isoValue = toInputDateFormat(value) || '';

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Ô nhập hiển thị cố định định dạng DD/MM/YYYY */}
      <input
        type="text"
        id={id}
        name={name}
        disabled={disabled}
        required={required}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-9 transition-all"
      />

      {/* Nút bấm icon Lịch mở bộ chọn ngày */}
      <button
        type="button"
        disabled={disabled}
        onClick={openCalendar}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-emerald-400 disabled:opacity-40 transition-colors"
        title="Chọn ngày từ lịch (DD/MM/YYYY)"
      >
        <CalendarIcon size={14} />
      </button>

      {/* Input date ẩn dùng để kích hoạt bộ chọn lịch của hệ điều hành/trình duyệt */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        tabIndex={-1}
        value={isoValue}
        onChange={handleNativeDateChange}
        className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 right-0"
      />
    </div>
  );
}

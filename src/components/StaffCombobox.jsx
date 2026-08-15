'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';

// Hàm tính độ ưu tiên chức vụ (rank càng nhỏ càng đưa lên đầu)
const getRoleRank = (staff) => {
  const text = (staff.position || staff.short_name || '').toLowerCase();
  
  if (text.startsWith('gđ') || (text.includes('giám đốc') && !text.includes('phó'))) return 1;
  if (text.startsWith('pgđ') || text.includes('phó giám đốc')) return 2;
  if (text.startsWith('tp') || (text.includes('trưởng phòng') && !text.includes('phó'))) return 3;
  if (text.startsWith('pp') || text.startsWith('ptp') || text.includes('phó trưởng phòng') || text.includes('phó phòng')) return 4;
  
  return 5; // Các nhân viên, a, c, cv khác
};

// Hàm lấy tên (từ cuối cùng trong họ và tên)
const getLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1].toLowerCase();
};

const formatName = (str) => {
  if (!str) return '';
  const tokens = str.split(' ');
  return tokens.map(token => {
    const t = token.toLowerCase();
    if (['gđ', 'pgđ', 'tp', 'pp', 'ptp'].includes(t)) {
      return t.toUpperCase();
    }
    return t.charAt(0).toUpperCase() + t.slice(1);
  }).join(' ');
};

export default function StaffCombobox({ 
  value, 
  onChange, 
  staffs = [], 
  placeholder = "-- Chọn nhân sự xử lý --"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sắp xếp danh sách staff theo chức vụ và tên ABC
  const sortedStaffs = [...staffs].sort((a, b) => {
    const rankA = getRoleRank(a);
    const rankB = getRoleRank(b);
    
    // Nếu khác chức vụ, xếp theo chức vụ trước
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    
    // Cùng chức vụ, xếp theo Tên ABC (chữ cái đầu của từ cuối cùng)
    const nameA = getLastName(a.full_name || a.short_name);
    const nameB = getLastName(b.full_name || b.short_name);
    
    return nameA.localeCompare(nameB, 'vi');
  });

  // Tính giá trị hiển thị khi ô đang đóng
  const getDisplayValue = () => {
    if (!value) return '';
    const vLower = value.toLowerCase();
    const found = staffs.find(s => (s.short_name || '').toLowerCase() === vLower || (s.full_name || '').toLowerCase() === vLower);
    if (found) {
      return formatName(found.short_name || found.full_name);
    }
    return formatName(value);
  };

  // Khi đang mở: lọc theo searchTerm
  const filtered = sortedStaffs.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const shortNameMatch = (s.short_name || '').toLowerCase().includes(term);
    const fullNameMatch = (s.full_name || '').toLowerCase().includes(term);
    return shortNameMatch || fullNameMatch;
  });

  const handleSelect = (staff) => {
    // Lưu tên đã format
    const val = formatName(staff.short_name || staff.full_name);
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleFocus = () => {
    setSearchTerm(''); // Xóa search để hiển thị toàn bộ danh sách
    setIsOpen(true);
  };

  return (
    <div className="relative group/field" ref={wrapperRef}>
      <div className="absolute left-3 top-3 pointer-events-none">
        <User className="w-4 h-4 text-slate-500" />
      </div>
      
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? searchTerm : getDisplayValue()}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={handleFocus}
        className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map(staff => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleSelect(staff)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-sm flex flex-col ${
                    (value && ((staff.short_name || '').toLowerCase() === value.toLowerCase() || (staff.full_name || '').toLowerCase() === value.toLowerCase())) ? 'bg-slate-800/80' : ''
                  }`}
                >
                  <span className={`font-medium ${
                    (value && ((staff.short_name || '').toLowerCase() === value.toLowerCase() || (staff.full_name || '').toLowerCase() === value.toLowerCase())) ? 'text-cyan-400' : 'text-slate-200'
                  }`}>
                    {formatName(staff.short_name || staff.full_name)}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-slate-500 text-xs">
                Không tìm thấy nhân sự phù hợp.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

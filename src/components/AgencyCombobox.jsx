'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, User, Check, X, Loader2 } from 'lucide-react';

export default function AgencyCombobox({ 
  value, 
  onChange, 
  agencies = [], 
  onAgenciesChange,
  confidence,
  placeholder = "Gõ để tìm (VD: UBND, Sở XD...)"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [addForm, setAddForm] = useState({ name: '', abbreviation: '', notes: '' });
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsAdding(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tính giá trị hiển thị khi ô đang đóng (tên viết tắt hoặc tên đầy đủ)
  const getDisplayValue = () => {
    if (!value) return '';
    const found = agencies.find(a => a.name === value);
    if (found && found.abbreviation) return `${found.abbreviation} (${found.name})`;
    return value;
  };

  // Khi đang mở: lọc theo searchTerm; khi rỗng hiển thị tất cả
  const filtered = agencies.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (a.name || '').toLowerCase().includes(term) || (a.abbreviation || '').toLowerCase().includes(term);
  });

  const handleSelect = (agencyName) => {
    onChange(agencyName);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleFocus = () => {
    setSearchTerm(''); // Xóa search để hiển thị toàn bộ danh sách
    setIsOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) return alert('Tên đơn vị không được để trống!');
    
    try {
      setSaving(true);
      const res = await fetch('/api/settings/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        if (onAgenciesChange) onAgenciesChange(data.data);
        handleSelect(data.data.name);
        setIsAdding(false);
        setAddForm({ name: '', abbreviation: '', notes: '' });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi thêm mới');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative group/field" ref={wrapperRef}>
      <div className="absolute left-3 top-3">
        <User className="w-4 h-4 text-slate-500" />
      </div>
      
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? searchTerm : getDisplayValue()}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          // Chỉ cập nhật formData khi user gõ tự do (không chọn từ list)
        }}
        onFocus={handleFocus}
        className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 shadow-inner"
      />
      
      {confidence !== undefined && (
        <div className="absolute top-2 right-2 pointer-events-none">
          {confidence}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 flex flex-col overflow-hidden">
          {!isAdding ? (
            <>
              <div className="flex-1 overflow-y-auto p-1">
                {filtered.length > 0 ? (
                  filtered.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelect(a.name)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm flex flex-col"
                    >
                      <span className="font-semibold text-slate-200">
                        {a.abbreviation ? a.abbreviation : a.name}
                      </span>
                      {a.abbreviation && <span className="text-[10px] text-slate-500 truncate">{a.name}</span>}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-slate-500 text-xs">
                    Không tìm thấy.
                  </div>
                )}
              </div>
              <div className="p-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setAddForm({ name: searchTerm, abbreviation: '', notes: '' });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Nơi phát hành mới
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAddSubmit} className="p-3 flex flex-col gap-3 bg-slate-900">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-1">
                <Plus className="w-3.5 h-3.5" /> Thêm nhanh Nơi phát hành
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tên đơn vị (Đầy đủ)</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={addForm.name}
                  onChange={e => setAddForm({...addForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none"
                  placeholder="VD: Ủy ban nhân dân TP.HCM"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tên viết tắt (Sẽ hiển thị)</label>
                <input 
                  type="text" 
                  value={addForm.abbreviation}
                  onChange={e => setAddForm({...addForm, abbreviation: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none"
                  placeholder="VD: UBND TP.HCM"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  value={addForm.notes}
                  onChange={e => setAddForm({...addForm, notes: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none"
                  placeholder="Không bắt buộc"
                />
              </div>
              
              <div className="flex gap-2 justify-end mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Lưu
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

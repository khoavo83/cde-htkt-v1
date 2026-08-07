
$file = "D:\Webapp CDE-HTKT\webapp\src\components\FolderTree.jsx"
$content = Get-Content $file -Raw -Encoding UTF8

# Tìm vị trí chính xác
$startMarker = "      {/* Modal G"
$endMarkerStr = "      )}`r`n`r`n    </div>"

# Thay thế toàn bộ phần modal
$newModal = @'
      {/* Modal Gắn Phiếu trình */}
      {attachingPhieuTrinh && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                Gắn Phiếu trình cho Công văn đi
              </h3>
              <button onClick={() => setAttachingPhieuTrinh(null)} className="text-slate-400 hover:text-red-400" disabled={isAttachingPhieuTrinh}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
                <div className="text-amber-400 font-semibold text-xs uppercase tracking-wide mb-1">Công văn đi</div>
                <div className="text-slate-200 font-mono font-bold text-sm">{attachingPhieuTrinh.so_vb}</div>
                <div className="text-slate-400 text-xs mt-0.5 line-clamp-2">{attachingPhieuTrinh.trich_yeu}</div>
              </div>
              <div className="text-xs bg-slate-800/60 rounded-lg px-3 py-2">
                <span className="text-slate-500">Phiếu trình sẽ đổi tên thành:</span>
                <div className="text-amber-400 font-mono mt-1">
                  {attachingPhieuTrinh.ngay_phat_hanh?.split('/').reverse().join('-')}_PTr-HTKT_{attachingPhieuTrinh.so_vb?.split('/')[0]}.pdf
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm Phiếu trình theo tên..."
                  value={attachPhieuTrinhSearch}
                  onChange={e => setAttachPhieuTrinhSearch(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-200"
                  disabled={isAttachingPhieuTrinh}
                />
              </div>
              {(() => {
                const phieuTrinhFiles = folderFiles.filter(f => {
                  if (f.id === attachingPhieuTrinh.id) return false;
                  if (f.parent_id) return false;
                  const fname = (f.name || f.file_name || '').toLowerCase();
                  const isPtr = fname.includes('ptr') || f.loai_vb === 'Phiếu trình';
                  if (!isPtr) return false;
                  if (attachPhieuTrinhSearch) {
                    return fname.includes(attachPhieuTrinhSearch.toLowerCase());
                  }
                  return true;
                });
                if (phieuTrinhFiles.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <div className="text-sm">
                        {attachPhieuTrinhSearch ? 'Không tìm thấy Phiếu trình phù hợp.' : 'Không có Phiếu trình nào chưa được gán trong thư mục này.'}
                      </div>
                      <div className="text-xs mt-1 text-slate-600">File Phiếu trình cần có "PTr" trong tên.</div>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5">
                    {phieuTrinhFiles.map(f => {
                      const fname = f.name || f.file_name || '';
                      const displayName = fname.replace(/\.pdf$/i, '');
                      return (
                        <div
                          key={f.id}
                          onClick={() => setAttachPhieuTrinhTargetId(f.id)}
                          className={`px-3 py-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 border ${
                            attachPhieuTrinhTargetId === f.id
                              ? 'bg-amber-500/15 border-amber-500/60'
                              : 'border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            attachPhieuTrinhTargetId === f.id ? 'border-amber-500' : 'border-slate-500'
                          }`}>
                            {attachPhieuTrinhTargetId === f.id && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <div className="overflow-hidden flex-1 min-w-0">
                            <div className="text-slate-200 text-sm font-medium truncate" title={fname}>{displayName}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-slate-800/80">
              <button
                onClick={() => setAttachingPhieuTrinh(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                disabled={isAttachingPhieuTrinh}
              >
                Hủy
              </button>
              <button
                disabled={!attachPhieuTrinhTargetId || isAttachingPhieuTrinh}
                onClick={handleConfirmAttachPhieuTrinh}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                {isAttachingPhieuTrinh ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Đồng ý gắn Phiếu trình
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
'@

# Tìm vị trí bắt đầu modal (từ dòng 1167)
$startIdx = $content.IndexOf("      {/* Modal G")
if ($startIdx -lt 0) { Write-Host "Không tìm thấy!"; exit }

# Lấy phần trước modal
$before = $content.Substring(0, $startIdx)
Write-Host "Before ends with: $($before.Substring($before.Length - 50))"

# Ghi file mới
$newContent = $before + $newModal
[System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done. New length: $($newContent.Length)"

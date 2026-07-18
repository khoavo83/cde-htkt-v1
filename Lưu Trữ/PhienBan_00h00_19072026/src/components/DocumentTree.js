import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, FileText } from 'lucide-react';

export default function DocumentTree({ documents, selectedFolder, onSelectFolder }) {
  const [expandedFolders, setExpandedFolders] = useState({
    'root': true, // Mặc định mở thư mục gốc
  });

  // Toggle trạng thái mở rộng/thu gọn thư mục
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Tính số lượng file trong mỗi thư mục
  const folderCounts = {};
  let totalFiles = 0;
  
  documents.forEach(doc => {
    const folder = doc.folder || 'Khác';
    folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    totalFiles++;
  });

  // Định nghĩa cấu trúc phân cấp thư mục cố định dựa trên báo cáo thực tế
  // để giao diện hiển thị dạng cây cha-con tuyệt đẹp
  const treeStructure = {
    name: "Bồi thường BT-CG",
    key: "root",
    isRoot: true,
    children: [
      {
        name: "26. Quy hoạch",
        key: "26. Quy hoạch",
        children: []
      },
      {
        name: "25. Thông tin khác",
        key: "25. Thông tin khác",
        children: [
          { name: "Sở NNMT", key: "Sở NNMT" },
          { name: "Văn phòng ĐKĐĐ TP", key: "Văn phòng ĐKĐĐ TP" },
          { name: "Lữ đoàn 239 - Binh chủng Công binh", key: "Lữ đoàn 239 - Binh chủng Công binh" },
          { name: "Tổng Công ty Xây dựng Lũng Lô", key: "Tổng Công ty Xây dựng Lũng Lô" },
          { name: "Tổng Công ty Thành An - Binh đoàn 11", key: "Tổng Công ty Thành An - Binh đoàn 11" },
          { name: "Trung tâm xử lý bom mìn", key: "Trung tâm xử lý bom mìn" },
          { name: "Lữ đoàn 299 -Quân đoàn 12", key: "Lữ đoàn 299 -Quân đoàn 12" },
          { name: "Công ty TNHH Phát triển Phú Mỹ Hưng", key: "Công ty TNHH Phát triển Phú Mỹ Hưng" }
        ]
      }
    ]
  };

  // Đếm đệ quy số lượng file trong thư mục (bao gồm cả thư mục con)
  const getFileCount = (node) => {
    if (!node.children || node.children.length === 0) {
      return folderCounts[node.name] || 0;
    }
    let count = folderCounts[node.name] || 0;
    node.children.forEach(child => {
      count += getFileCount(child);
    });
    return count;
  };

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedFolders[node.key];
    const isSelected = selectedFolder === node.key;
    const fileCount = getFileCount(node);

    // Tính toán số lượng file trực tiếp + file của con để hiển thị
    const displayCount = fileCount;

    return (
      <div key={node.key} className="select-none">
        {/* Row */}
        <div 
          onClick={() => onSelectFolder(node.key)}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 group text-xs ${
            isSelected 
              ? 'bg-emerald-500/15 text-emerald-400 font-semibold border-l-2 border-emerald-500' 
              : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Toggle Icon */}
            {hasChildren ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.key);
                }}
                className="p-0.5 hover:bg-slate-700/50 rounded text-slate-500 hover:text-slate-300 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4.5"></span>
            )}

            {/* Folder Icon */}
            {isSelected ? (
              <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 shrink-0 group-hover:text-amber-400 transition-colors" />
            )}

            {/* Name */}
            <span className="truncate" title={node.name}>{node.name}</span>
          </div>

          {/* Badge Count */}
          {displayCount > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
              isSelected 
                ? 'bg-emerald-500/20 text-emerald-300' 
                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
            }`}>
              {displayCount}
            </span>
          )}
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-3.5 space-y-3">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cây thư mục văn bản</h4>
        {selectedFolder !== 'all' && (
          <button 
            onClick={() => onSelectFolder('all')}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Xem tất cả
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
        {/* Tất cả tài liệu option */}
        <div 
          onClick={() => onSelectFolder('all')}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 group text-xs ${
            selectedFolder === 'all' 
              ? 'bg-emerald-500/15 text-emerald-400 font-semibold border-l-2 border-emerald-500' 
              : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Tất cả văn bản dự án</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            selectedFolder === 'all' 
              ? 'bg-emerald-500/20 text-emerald-300' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {totalFiles}
          </span>
        </div>

        <div className="w-full h-px bg-slate-800/60 my-2"></div>

        {/* Render Root node */}
        {renderNode(treeStructure)}
      </div>
    </div>
  );
}

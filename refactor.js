const fs = require('fs');
let content = fs.readFileSync('src/app/page.js', 'utf8');

// Extract Documents tab content
const docTabStart = content.indexOf('{/* ---- TAB: QU?N LÝ VAN B?N ---- */}');
const docTabEnd = content.indexOf('{/* ---- TAB: QU?N LÝ D? ÁN ---- */}');
let docTabContent = content.substring(docTabStart, docTabEnd);

// Remove docTabContent from main
content = content.replace(docTabContent, '');

// Modify docTabContent to use projectSubTab
docTabContent = docTabContent.replace(
  "{activeMainTab === 'documents' && (",
  "{/* === N?I DUNG QU?N LÝ VAN B?N === */}\n              {projectSubTab === 'documents' && ("
);

// Add Sub-Tab button
const folderSubTabRegex = /(<button\s*onClick=\{\(\) => setProjectSubTab\('folders'\)\}[\s\S]*?<\/button>)/;
const docSubTabBtn = `<button 
                  onClick={() => setProjectSubTab('documents')}
                  className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${projectSubTab === 'documents' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}\`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Qu?n lý Van b?n ({filteredDocuments.length})
                  </div>
                </button>
                `;
content = content.replace(folderSubTabRegex, docSubTabBtn + "$1");

// Insert docTabContent into projects tab content
const projectsContentStart = content.indexOf('<div className="flex-1 min-h-0 overflow-y-auto">') + '<div className="flex-1 min-h-0 overflow-y-auto">'.length;
content = content.substring(0, projectsContentStart) + '\n              ' + docTabContent + content.substring(projectsContentStart);

fs.writeFileSync('src/app/page.js', content);
console.log('Refactor completed');

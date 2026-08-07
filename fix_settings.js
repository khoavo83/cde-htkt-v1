const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/SettingsTab.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="bg-slate-900 text-slate-400 text-xs uppercase sticky top-0 z-10 shadow-sm border-b border-slate-800"', 
  'className="text-slate-400 text-xs uppercase sticky top-0 z-20 shadow-md border-b border-slate-700" style={{ backgroundColor: \'#0f172a\' }}'
);

content = content.replace('className="px-4 py-3 w-16 text-center font-semibold bg-slate-900"', 'className="px-4 py-3 w-16 text-center font-semibold"');
content = content.replace('className="px-4 py-3 font-semibold bg-slate-900"', 'className="px-4 py-3 font-semibold"');
content = content.replace('className="px-4 py-3 w-48 font-semibold bg-slate-900"', 'className="px-4 py-3 w-48 font-semibold"');
content = content.replace('className="px-4 py-3 w-64 font-semibold bg-slate-900"', 'className="px-4 py-3 w-64 font-semibold"');
content = content.replace('className="px-4 py-3 w-28 text-center font-semibold bg-slate-900"', 'className="px-4 py-3 w-28 text-center font-semibold"');

fs.writeFileSync(file, content);
console.log("SettingsTab fixed.");

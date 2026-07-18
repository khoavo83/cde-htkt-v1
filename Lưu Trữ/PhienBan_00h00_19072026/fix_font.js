const fs = require('fs');
const path = 'src/components/FolderTree.jsx';
let content = fs.readFileSync(path, 'utf8');

// Thay đổi trong DocRow (từ dòng 190 đến 230)
// Thay class `text-xs` bằng `text-sm` ở các cột td để đồng bộ với font chung của table và khung bên trái

content = content.replace(
  /<td className="px-3 py-2\.5 text-slate-400 text-xs w-8">/g,
  '<td className="px-3 py-2.5 text-slate-400 text-sm w-8">'
);

content = content.replace(
  /<td className="px-3 py-2\.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">/g,
  '<td className="px-3 py-2.5 font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">'
);

content = content.replace(
  /<td className="px-3 py-2\.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">/g,
  '<td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">'
);

content = content.replace(
  /<td className="px-3 py-2\.5 text-xs text-slate-600 dark:text-slate-400 max-w-\[140px\]">/g,
  '<td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 max-w-[140px]">'
);

content = content.replace(
  /<td className="px-3 py-2\.5 text-xs text-slate-800 dark:text-slate-200 max-w-xs">/g,
  '<td className="px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 max-w-xs">'
);

// EditableCell input text-xs -> text-sm
content = content.replace(
  /className="text-xs w-full border border-emerald-400/g,
  'className="text-sm w-full border border-emerald-400'
);

// Thêm text-sm vào Loại VB (dù mặc định kế thừa sm, thêm vào cho rõ ràng, nhưng không cần thiết)
// Cập nhật lại Loading state trong DocRow
content = content.replace(
  /<td className="px-3 py-2\.5 text-slate-400 text-xs">\{idx \+ 1\}<\/td>/g,
  '<td className="px-3 py-2.5 text-slate-400 text-sm">{idx + 1}</td>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed font size in FolderTree.jsx');

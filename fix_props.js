const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let content = fs.readFileSync(file, 'utf8');

// Fix: add missing allFolderFiles and agencies props to function signature
content = content.replace(
  'export default function DocumentAnalyzeModal({\n    document: doc,\n    isOpen,\n    onClose,\n    onSave,\n    allDocuments = [],\n  }) {',
  'export default function DocumentAnalyzeModal({\n    document: doc,\n    isOpen,\n    onClose,\n    onSave,\n    allDocuments = [],\n    allFolderFiles = [],\n    agencies = [],\n  }) {'
);

fs.writeFileSync(file, content);
console.log('Props fixed:', content.includes('agencies = []'));

const fs = require('fs');
const comboboxFile = 'D:/Webapp CDE-HTKT/webapp/src/components/AgencyCombobox.jsx';
let comboboxContent = fs.readFileSync(comboboxFile, 'utf8');

comboboxContent = comboboxContent.replace(
  'confidence \n}) {', 
  'confidence,\n  placeholder = "Gõ để tìm (VD: UBND, Sở XD...)"\n}) {'
);
comboboxContent = comboboxContent.replace(
  'placeholder="Gõ để tìm Nơi phát hành (VD: UBND, Sở XD...)"', 
  'placeholder={placeholder}'
);
fs.writeFileSync(comboboxFile, comboboxContent);

const modalFile = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let modalContent = fs.readFileSync(modalFile, 'utf8');
modalContent = modalContent.replace(
  'agencies={agencies}\n                    onChange={(val) => setFormData(prev => ({ ...prev, issuer: val }))}',
  'agencies={agencies}\n                    placeholder="Gõ để tìm Nơi phát hành..."\n                    onChange={(val) => setFormData(prev => ({ ...prev, issuer: val }))}'
);
modalContent = modalContent.replace(
  'agencies={agencies}\n                    onChange={(val) => setFormData(prev => ({ ...prev, receiver: val }))}',
  'agencies={agencies}\n                    placeholder="Gõ để tìm Nơi nhận..."\n                    onChange={(val) => setFormData(prev => ({ ...prev, receiver: val }))}'
);
fs.writeFileSync(modalFile, modalContent);

console.log("Updated placeholders successfully.");

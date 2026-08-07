const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import AgencyCombobox')) {
    content = content.replace('import { \n  X, Save, Bot', 'import AgencyCombobox from \'./AgencyCombobox\';\nimport { \n  X, Save, Bot');
}

const targetStr = '<textarea';
const nameIssuer = 'name="issuer"';

let idx = content.indexOf(nameIssuer);
if (idx > -1) {
  let startIdx = content.lastIndexOf('<div className="col-span-12 sm:col-span-6 relative">', idx);
  let endIdx = content.indexOf('</div>\n                </div>', idx) + 6;
  
  const newBlock = `                <div className="col-span-12 sm:col-span-6 relative">
                  <AgencyCombobox
                    value={formData.issuer}
                    agencies={agencies}
                    onChange={(val) => setFormData(prev => ({ ...prev, issuer: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.issuer} />}
                  />`;
  
  content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Replaced textarea with AgencyCombobox successfully.");
} else {
  console.log("Could not find name='issuer'");
}

const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AgencyCombobox')) {
  content = content.replace('import { \n  X, Save, Bot', 'import AgencyCombobox from \'./AgencyCombobox\';\nimport { \n  X, Save, Bot');
}

if (!content.includes('agencies = [],\n}) {')) {
  content = content.replace('allFolderFiles = [],\n}) {', 'allFolderFiles = [],\n  agencies = [],\n}) {');
}

content = content.replace(
  /<div className="col-span-12 sm:col-span-6 relative">[\s\S]*?name="issuer"[\s\S]*?<ConfidenceBadge value=\{analysisResult\?\.confidence\?\.issuer\} \/>\s*<\/div>\s*<\/div>/g,
  `<div className="col-span-12 sm:col-span-6 relative">
                  <AgencyCombobox
                    value={formData.issuer}
                    agencies={agencies}
                    placeholder="Gõ để tìm Nơi phát hành..."
                    onChange={(val) => setFormData(prev => ({ ...prev, issuer: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.issuer} />}
                  />
                </div>`
);

content = content.replace(
  /<div className="col-span-12 sm:col-span-6 relative">[\s\S]*?name="receiver"[\s\S]*?<ConfidenceBadge value=\{analysisResult\?\.confidence\?\.receiver\} \/>\s*<\/div>\s*<\/div>/g,
  `<div className="col-span-12 sm:col-span-6 relative">
                  <AgencyCombobox
                    value={formData.receiver}
                    agencies={agencies}
                    placeholder="Gõ để tìm Nơi nhận..."
                    onChange={(val) => setFormData(prev => ({ ...prev, receiver: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.receiver} />}
                  />
                </div>`
);

fs.writeFileSync(file, content);
console.log("Replaced using Regex successfully.");

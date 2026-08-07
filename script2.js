const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let content = fs.readFileSync(file, 'utf8');

const nameReceiver = 'name="receiver"';

let idx = content.indexOf(nameReceiver);
if (idx > -1) {
  let startIdx = content.lastIndexOf('<div className="col-span-12 sm:col-span-6 relative">', idx);
  let endIdx = content.indexOf('</div>\n                  </div>', idx) + 6;
  if (endIdx === 5) { // fallback
    endIdx = content.indexOf('</div>\n                </div>', idx) + 6;
  }
  
  const newBlock = `                <div className="col-span-12 sm:col-span-6 relative">
                  <AgencyCombobox
                    value={formData.receiver}
                    agencies={agencies}
                    onChange={(val) => setFormData(prev => ({ ...prev, receiver: val }))}
                    confidence={<ConfidenceBadge value={analysisResult?.confidence?.receiver} />}
                  />`;
  
  content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Replaced receiver textarea with AgencyCombobox successfully.");
} else {
  console.log("Could not find name='receiver'");
}

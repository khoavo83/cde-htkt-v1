const fs = require('fs');
const file = 'D:/Webapp CDE-HTKT/webapp/src/components/DocumentAnalyzeModal.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import AgencyCombobox')) {
  content = content.replace('import { useState, useEffect } from \'react\';', 'import { useState, useEffect } from \'react\';\nimport AgencyCombobox from \'./AgencyCombobox\';');
  fs.writeFileSync(file, content);
  console.log('Import added successfully.');
} else {
  console.log('Import already exists.');
}

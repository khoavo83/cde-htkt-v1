
const fs = require('fs');
let content = fs.readFileSync('D:/Webapp CDE-HTKT/webapp/src/app/page.js', 'utf8');
let blockStart = content.indexOf('{projectSubTab === \'documents\'');
let blockEnd = content.indexOf('{projectSubTab === \'folders\'');
let block = content.substring(blockStart, blockEnd);
console.log(block.length);


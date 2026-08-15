require('dotenv').config({path: '.env.local'}); fetch('http://localhost:3000/api/drive/tree?projectId=1b-TVtTx4cdx_fsGcxQ9ihB76QphRiJQH').then(r => r.json()).then(console.log).catch(console.error);

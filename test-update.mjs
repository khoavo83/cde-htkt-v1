import fetch from 'node-fetch';

async function run() {
  try {
    // get a doc
    const res = await fetch('http://localhost:3000/api/documents');
    const data = await res.json();
    if (!data.documents || data.documents.length === 0) return;
    const doc = data.documents[0];
    console.log('Original Doc:', doc);
    
    // update it
    const resPut = await fetch('http://localhost:3000/api/drive/extract', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: doc.id,
        loai_vb: 'Test Category',
        so_vb: 'Test Number',
        ngay_phat_hanh: 'Test Date',
        noi_phat_hanh: 'Test Issuer',
        noi_gui: 'Test Receiver',
        trich_yeu: 'Test Notes',
        is_outgoing: true,
      })
    });
    const putData = await resPut.json();
    console.log('Update Result:', putData);
    
    // verify
    const res2 = await fetch('http://localhost:3000/api/documents');
    const data2 = await res2.json();
    const updatedDoc = data2.documents.find(d => d.id === doc.id);
    console.log('Updated Doc:', updatedDoc);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

run();

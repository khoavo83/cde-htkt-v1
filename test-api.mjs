import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/documents');
    const data = await res.json();
    console.log('Source:', data.source);
    console.log('Number of documents:', data.documents ? data.documents.length : 0);
    if (data.error) {
      console.log('Error:', data.error);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

run();

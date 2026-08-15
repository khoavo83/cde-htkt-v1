import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getPhapLyString(doc) {
    let str = doc.loai_vb ? `${doc.loai_vb}` : '';
    if (doc.so_vb) {
      str += ` số ${doc.so_vb}`;
    }
    if (doc.ngay_phat_hanh) {
      let dd, mm, yyyy;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(doc.ngay_phat_hanh)) {
        [dd, mm, yyyy] = doc.ngay_phat_hanh.split('/');
      } else if (/^\d{4}-\d{2}-\d{2}/.test(doc.ngay_phat_hanh)) {
        [yyyy, mm, dd] = doc.ngay_phat_hanh.split('T')[0].split('-');
      } else {
        const d = new Date(doc.ngay_phat_hanh);
        if (!isNaN(d.getTime())) {
          dd = String(d.getDate()).padStart(2, '0');
          mm = String(d.getMonth() + 1).padStart(2, '0');
          yyyy = d.getFullYear();
        }
      }
      if (dd && mm && yyyy) {
        str += ` ngày ${dd} tháng ${mm} năm ${yyyy}`;
      } else {
        str += ` ngày ${doc.ngay_phat_hanh}`;
      }
    }
    
    if (doc.noi_phat_hanh) {
      str += ` của ${doc.noi_phat_hanh}`;
    }
    
    if (doc.noi_gui) {
      str += ` ký giữa ${doc.noi_gui}`;
    }
    
    if (doc.trich_yeu) {
      let trichYeu = doc.trich_yeu.trim();
      trichYeu = trichYeu.replace(/^v\/v:?\s*/i, 'về việc ');
      trichYeu = trichYeu.replace(/\s+v\/v\s+/gi, ' về việc ');
      
      if (!/^về việc/i.test(trichYeu)) {
        str += ` về việc ${trichYeu}`;
      } else {
        str += ` ${trichYeu}`;
      }
    }
    
    return str.trim();
}

async function run() {
    console.log("Fetching documents from drive_file_metadata...");
    let allDocs = [];
    let page = 0;
    while(true) {
        const { data, error } = await supabase.from('drive_file_metadata').select('*').range(page*1000, (page+1)*1000 - 1);
        if (error) {
            console.error("Fetch error:", error);
            break;
        }
        if (!data || data.length === 0) break;
        allDocs = allDocs.concat(data);
        page++;
    }
    
    console.log(`Found ${allDocs.length} documents.`);
    
    let updatedCount = 0;
    let failedCount = 0;
    for (const doc of allDocs) {
        const phapLy = getPhapLyString(doc);
        if (phapLy && phapLy !== doc.phap_ly) {
            const { error } = await supabase.from('drive_file_metadata').update({ phap_ly: phapLy }).eq('file_id', doc.file_id);
            if (error) {
                if (failedCount === 0) {
                    console.error(`Error updating doc ${doc.file_id}:`, error.message);
                }
                failedCount++;
            } else {
                updatedCount++;
                if (updatedCount % 50 === 0) console.log(`Updated ${updatedCount}...`);
            }
        }
    }
    console.log(`Done. Updated ${updatedCount} documents. Failed: ${failedCount}`);
}
run();

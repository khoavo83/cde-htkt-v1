export function parseDocDetailsImproved(fileName, folderName = '') {
  // Trích xuất ngày ban hành
  const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  const altDateMatch = fileName.match(/(\d{1,2})(\d{2})(\d{4})/);
  let issuedDate = 'Chưa xác định';
  
  if (dateMatch) {
    issuedDate = dateMatch[1];
  } else if (altDateMatch) {
    const [, d, m, y] = altDateMatch;
    if (parseInt(m) <= 12 && parseInt(d) <= 31) {
      issuedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Trích xuất số hiệu văn bản
  let documentNumber = 'Chưa xác định';

  const numP1 = fileName.match(/^\d{4}-\d{2}-\d{2}_([^_]+)_([A-ZĐa-zđ\-\.]+(?:-[A-ZĐa-zđ]+)*)_/);
  const spacePattern = fileName.match(/^(\d{1,5})\s+([A-ZĐa-zđ]+)-([A-ZĐa-zđ]+)\s+(\d{6,8})\s+(.*)/i);
  
  if (numP1) {
    documentNumber = `${numP1[1]}/${numP1[2]}`;
  } else if (spacePattern) {
    documentNumber = `${spacePattern[1]}/${spacePattern[2]}-${spacePattern[3]}`.toUpperCase();
    
    const dStr = spacePattern[4];
    if (dStr.length === 7) {
      const d = dStr.substring(0, 2);
      const m = dStr.substring(2, 3).padStart(2, '0');
      const y = dStr.substring(3);
      issuedDate = `${y}-${m}-${d}`;
    } else if (dStr.length === 8) {
      const d = dStr.substring(0, 2);
      const m = dStr.substring(2, 4);
      const y = dStr.substring(4);
      issuedDate = `${y}-${m}-${d}`;
    }
  } else {
    const numP2 = fileName.match(/^\d{4}-\d{2}-\d{2}_(\d{2,6})_/);
    if (numP2) {
      const orgMatch = fileName.match(new RegExp(`${numP2[1]}_([A-ZĐÀ-Ỹa-zđà-ỹ\\-\\.]+)_`));
      if (orgMatch) {
        documentNumber = `${numP2[1]}/${orgMatch[1]}`;
      } else {
        documentNumber = numP2[1];
      }
    } else {
      const numP3 = fileName.match(/^(\d{3,6})-/);
      if (numP3) {
        documentNumber = numP3[1];
      } else {
        const ptrMatch = fileName.match(/_(PTr[^_]*)/);
        if (ptrMatch) {
          documentNumber = ptrMatch[1];
        } else {
           const startNum = fileName.match(/^(\d{1,5})\s+([A-Za-zĐđ]+)[-\s]([A-Za-zĐđ]+)/);
           if (startNum) {
             documentNumber = `${startNum[1]}/${startNum[2]}-${startNum[3]}`.toUpperCase();
           }
        }
      }
    }
  }

  // Phân tích cơ quan ban hành
  let issuer = 'Ban Quản lý Đường sắt Đô thị TP.HCM';

  const folderIssuerMap = {
    'Sở NNMT': 'Sở Nông nghiệp & Phát triển Nông thôn TP.HCM',
    'Văn phòng ĐKĐĐ TP': 'Văn phòng Đăng ký Đất đai TP.HCM',
    'Lữ đoàn 239 - Binh chủng Công binh': 'Lữ đoàn Công binh 239 - Binh chủng Công binh',
    'Tổng Công ty Xây dựng Lũng Lô': 'Tổng Công ty Xây dựng Lũng Lô - Bộ Quốc phòng',
    'Tổng Công ty Thành An - Binh đoàn 11': 'Tổng Công ty Thành An - Binh đoàn 11',
    'Trung tâm xử lý bom mìn': 'Trung tâm Xử lý Bom mìn Quốc gia',
    'Lữ đoàn 299 -Quân đoàn 12': 'Lữ đoàn Công binh 299 - Quân đoàn 12',
    'Công ty TNHH Phát triển Phú Mỹ Hưng': 'Công ty TNHH Phát triển Phú Mỹ Hưng',
    'Xí nghiệp TDNS': 'Xí nghiệp Truyền dẫn Nước sạch',
  };

  if (folderIssuerMap[folderName]) {
    issuer = folderIssuerMap[folderName];
  } else {
    const upperName = fileName.toUpperCase();
    if (upperName.includes('VPĐK') || upperName.includes('VĂN PHÒNG ĐĂNG KÝ')) {
      issuer = 'Văn phòng Đăng ký Đất đai TP.HCM';
    } else if (upperName.includes('BQLĐSĐT')) {
      issuer = 'Ban Quản lý Đường sắt Đô thị TP.HCM';
    } else if (upperName.includes('PMH') || upperName.includes('PHÚ MỸ HƯNG')) {
      issuer = 'Công ty TNHH Phát triển Phú Mỹ Hưng';
    } else if (upperName.includes('SNN') || upperName.includes('SỞ NN')) {
      issuer = 'Sở Nông nghiệp & Phát triển Nông thôn TP.HCM';
    } else if (upperName.includes('UBND')) {
      issuer = 'UBND TP.HCM';
    } else if (upperName.includes('TCT') || upperName.includes('TỔNG CÔNG TY')) {
      if (upperName.includes('LŨNG LÔ') || upperName.includes('LUNG LO')) {
        issuer = 'Tổng Công ty Xây dựng Lũng Lô';
      } else if (upperName.includes('THÀNH AN') || upperName.includes('THANH AN')) {
        issuer = 'Tổng Công ty Thành An - Binh đoàn 11';
      }
    } else if (upperName.includes('TBMNT') || upperName.includes('TBMMT')) {
      issuer = 'Trung tâm Xử lý Bom mìn Quốc gia';
    }
  }

  // Trích yếu nội dung
  let notes = fileName;
  const cleanName = fileName
    .replace(/^\d{4}-\d{2}-\d{2}_/, '')  // Bỏ ngày
    .replace(/\.[^/.]+$/, '')             // Bỏ extension
    .replace(/\.signed/g, '');            // Bỏ .signed

  const parts = cleanName.split('_');
  if (parts.length > 2) {
    notes = parts.slice(2).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  } else if (parts.length > 1) {
    notes = parts.slice(1).join(' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    notes = cleanName.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
  notes = notes.charAt(0).toUpperCase() + notes.slice(1);

  let category = 'Khác';
  if (folderName.includes('Quy hoạch') || fileName.includes('quy hoạch') || fileName.includes('QH')) category = 'Quy hoạch';
  else if (folderName.includes('Sở NNMT') || folderName.includes('Sở NN')) category = 'Sở ngành';
  else if (folderName.includes('ĐKĐĐ') || folderName.includes('Địa chính') || fileName.includes('đất đai') || fileName.includes('dat dai')) category = 'Đất đai';
  else if (folderName.includes('bom mìn') || folderName.includes('RPBM') || folderName.includes('Lũng Lô') || folderName.includes('Thành An') || folderName.includes('Lữ đoàn') || fileName.includes('RPBM') || fileName.includes('bom min')) category = 'Rà phá bom mìn';
  else if (folderName.includes('Phú Mỹ Hưng') || folderName.includes('PMH') || fileName.includes('PMH')) category = 'Phú Mỹ Hưng';

  return {
    documentNumber,
    issuedDate,
    issuer,
    notes,
    category,
    loai_vb: 'Khác',
  };
}

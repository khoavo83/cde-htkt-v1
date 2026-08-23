/**
 * Bộ tiện ích Định dạng Chuẩn Việt Nam (VN Formatters)
 * Tuân thủ quy định hiển thị thời gian, tiền tệ và số liệu tại Việt Nam
 */

/**
 * Định dạng ngày tháng chuẩn Việt Nam (DD/MM/YYYY)
 * @param {string | Date | null | undefined} dateInput 
 * @returns {string} Ví dụ: "26/06/2026" hoặc "-" nếu rỗng
 */
export function formatDateVN(dateInput) {
  if (!dateInput) return '-';
  try {
    // Nếu là dạng chuỗi 'YYYY-MM-DD' hoặc 'YYYY-MM-DD...'
    if (typeof dateInput === 'string') {
      const cleanStr = dateInput.split('T')[0].trim();
      const parts = cleanStr.split(/[-/]/);
      if (parts.length === 3) {
        // Nếu bắt đầu bằng năm (4 chữ số): YYYY-MM-DD
        if (parts[0].length === 4) {
          const [year, month, day] = parts;
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
        // Nếu đã là DD/MM/YYYY hoặc DD-MM-YYYY
        if (parts[2].length === 4) {
          return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
        }
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput || '-');
  }
}

/**
 * Chuyển đổi mọi định dạng ngày (DD/MM/YYYY, YYYY-MM-DD, ISO string...) thành YYYY-MM-DD cho <input type="date">
 * @param {string | Date | null | undefined} dateInput 
 * @returns {string} Chuỗi định dạng YYYY-MM-DD hoặc rỗng nếu không hợp lệ
 */
export function toInputDateFormat(dateInput) {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string') {
      const cleanStr = dateInput.split('T')[0].trim();
      const parts = cleanStr.split(/[-/]/);
      if (parts.length === 3) {
        // Nếu đã là YYYY-MM-DD
        if (parts[0].length === 4) {
          const [year, month, day] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Nếu là DD/MM/YYYY hoặc DD-MM-YYYY
        if (parts[2].length === 4) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

/**
 * Định dạng ngày giờ chuẩn Việt Nam (HH:mm DD/MM/YYYY)
 * @param {string | Date | null | undefined} dateInput 
 * @returns {string} Ví dụ: "14:30 26/06/2026"
 */
export function formatDateTimeVN(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDateVN(dateInput);

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${formatDateVN(d)}`;
  } catch (e) {
    return formatDateVN(dateInput);
  }
}

/**
 * Định dạng tiền tệ chuẩn Việt Nam (Dấu chấm '.' phân cách hàng nghìn, đơn vị 'đ' hoặc 'VNĐ')
 * @param {number | string | null | undefined} val 
 * @param {boolean} showUnit Có hiển thị đơn vị 'đ' hay không
 * @returns {string} Ví dụ: "9.813.320.703.412 đ"
 */
export function formatMoneyVN(val, showUnit = true) {
  if (val === null || val === undefined || val === '') return showUnit ? '0 đ' : '0';
  const num = Number(val);
  if (isNaN(num)) return showUnit ? '0 đ' : '0';
  if (num === 0) return showUnit ? '0 đ' : '0';

  // Intl vi-VN tự động dùng dấu chấm phân cách hàng nghìn và dấu phẩy cho thập phân
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2
  }).format(num);

  return showUnit ? `${formatted} đ` : formatted;
}

/**
 * Định dạng con số chuẩn Việt Nam (diện tích, số lượng...)
 * @param {number | string | null | undefined} val 
 * @param {number} decimals Số chữ số thập phân tối đa
 * @returns {string} Ví dụ: "1.234.567" hoặc "1.234,5"
 */
export function formatNumberVN(val, decimals = 0) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Định dạng tỷ lệ phần trăm chuẩn Việt Nam (Dấu phẩy cho thập phân)
 * @param {number | string | null | undefined} val 
 * @param {number} decimals 
 * @returns {string} Ví dụ: "61,1%" hoặc "100%"
 */
export function formatPercentVN(val, decimals = 1) {
  if (val === null || val === undefined || val === '') return '0%';
  const num = Number(val);
  if (isNaN(num)) return '0%';

  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: decimals
  }).format(num);

  return `${formatted}%`;
}

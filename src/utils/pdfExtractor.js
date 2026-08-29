import { getDocumentProxy } from 'unpdf';

export async function extractAllPdfPagesStructured(buffer) {
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const totalPages = pdf.numPages || 1;

  const pagesData = [];
  let totalCharacters = 0;
  let textPagesCount = 0;
  let emptyPagesCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Nhóm text theo dòng dựa trên tọa độ Y và X
      const items = textContent.items || [];
      if (items.length === 0) {
        emptyPagesCount++;
        pagesData.push({
          pageNumber: pageNum,
          text: '',
          isEmpty: true
        });
        continue;
      }

      // Sắp xếp các phần tử theo thứ tự đọc: từ trên xuống dưới (Y giảm dần), từ trái sang phải (X tăng dần)
      const sortedItems = [...items].sort((a, b) => {
        const yA = a.transform ? a.transform[5] : 0;
        const yB = b.transform ? b.transform[5] : 0;
        const xA = a.transform ? a.transform[4] : 0;
        const xB = b.transform ? b.transform[4] : 0;

        if (Math.abs(yA - yB) > 3) {
          return yB - yA; // Y cao hơn (ở trên) trước
        }
        return xA - xB; // Cùng dòng: từ trái sang phải
      });

      // Ghép thành các dòng văn bản hoàn chỉnh
      const lines = [];
      let currentLine = '';
      let lastY = null;

      for (const item of sortedItems) {
        if (!item.str && item.str !== '') continue;
        const y = item.transform ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          // Thêm dấu cách nếu cần giữa 2 từ trong cùng dòng
          if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ') && item.str.length > 0) {
            currentLine += ' ' + item.str;
          } else {
            currentLine += item.str;
          }
        }
        lastY = y;
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const pageText = lines.join('\n');
      if (pageText.trim().length > 15) {
        textPagesCount++;
        totalCharacters += pageText.length;
        pagesData.push({
          pageNumber: pageNum,
          text: pageText.trim(),
          isEmpty: false
        });
      } else {
        emptyPagesCount++;
        pagesData.push({
          pageNumber: pageNum,
          text: pageText.trim(),
          isEmpty: true
        });
      }
    } catch (pageErr) {
      console.warn(`Lỗi đọc trang ${pageNum}:`, pageErr.message);
      pagesData.push({
        pageNumber: pageNum,
        text: `*(Lỗi đọc trang ${pageNum}: ${pageErr.message})*`,
        isEmpty: true
      });
    }
  }

  return {
    totalPages,
    textPagesCount,
    emptyPagesCount,
    totalCharacters,
    pages: pagesData
  };
}

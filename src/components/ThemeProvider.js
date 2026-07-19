'use client';

import { useEffect } from 'react';

// Thay thế next-themes bằng cách đơn giản set class "dark" trực tiếp
// để tránh lỗi Console "script tag" trên Next.js 16
export default function ThemeProvider({ children, defaultTheme = 'dark' }) {
  useEffect(() => {
    // Đảm bảo class "dark" luôn có trên thẻ <html>
    const root = document.documentElement;
    if (defaultTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [defaultTheme]);

  return <>{children}</>;
}

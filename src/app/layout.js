import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CDE-HTKT | Hệ Thống Quản Lý Bồi Thường Tái Định Cư & GIS",
  description: "Giải pháp chuyển đổi số quản lý tiến độ giải phóng mặt bằng, di dời hạ tầng kỹ thuật và không gian hóa bản đồ GIS cho dự án đường sắt đô thị.",
};


import ThemeProvider from "@/components/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-slate-950" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

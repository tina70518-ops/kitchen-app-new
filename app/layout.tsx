import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "九丰炸物專門店 - 管理系統",
  description: "線上點餐與內部財務管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <div className="w-full max-w-2xl mx-auto min-h-screen bg-gray-50 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

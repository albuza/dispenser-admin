import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dispenser Admin",
  description: "ESP32 Dispenser Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}

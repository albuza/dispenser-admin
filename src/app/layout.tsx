import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}

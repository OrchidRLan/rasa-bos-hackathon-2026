import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUWA AI",
  description: "Persistent Autonomous Voice Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F4F6FA] text-slate-900 antialiased">{children}</body>
    </html>
  );
}

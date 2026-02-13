import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Bookmark App",
  description: "Manage your bookmarks with real-time synchronization",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 p-0 w-full h-full overflow-x-hidden bg-slate-900">{children}</body>
    </html>
  );
}

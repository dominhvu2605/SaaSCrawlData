import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CrawData – Smart Web Data Extraction",
    template: "%s | CrawData",
  },
  description:
    "Extract structured data from any website using AI. Export to CSV or Excel in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

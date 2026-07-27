import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Great Lakes ToteOps",
  description: "Rental Inventory, Dispatch and Field Operations",
  applicationName: "Great Lakes ToteOps",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ToteOps" },
};

export const viewport: Viewport = { themeColor: "#123b55", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

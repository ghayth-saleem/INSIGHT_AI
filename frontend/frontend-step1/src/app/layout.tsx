import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";
import Sidebar from "@/components/Sidebar";

// Heading font
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Body + data font
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "InsightAI — Marketing Intelligence",
  description: "AI-powered social media analytics and decision support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable}`}>
      <body className="bg-bg-primary text-text-primary font-mono antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* Main content area — offset by sidebar width */}
            <main className="ml-56 flex-1 p-8">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

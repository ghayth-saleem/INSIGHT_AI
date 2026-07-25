import type { Metadata } from "next";
import { Syne, Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";
import Sidebar from "@/components/Sidebar";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "InsightAI - Marketing Intelligence",
  description: "AI-powered social media analytics and decision support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable} ${inter.variable}`}>
      <body className="bg-bg-primary text-text-primary font-body antialiased">
        <SessionProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-h-screen overflow-x-hidden" style={{ marginLeft: "64px" }}>
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
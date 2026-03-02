import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/app/providers";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CS Admission Intelligence",
    template: "%s — CS Admission Intelligence",
  },
  description:
    "Platform for CS PhD admissions — ranked programs, requirements, deadlines, and data confidence scores.",
  keywords: ["CS PhD admissions", "graduate school", "computer science", "GRE", "TOEFL"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <TRPCReactProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-100 bg-white py-5 text-center text-xs text-slate-400">
              CS Admission Intelligence © {new Date().getFullYear()} by Mahim
            </footer>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

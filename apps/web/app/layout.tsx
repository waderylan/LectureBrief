import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LectureBrief",
  description: "Weekly lecture recaps: what was said off the slides, and what to build from it.",
  // Site-wide default — BUILD_PLAN.md Day 5: unlisted until the operator
  // explicitly flips it (ARCHITECTURE.md §10). Every page also sets this
  // itself, but the default here means a new route can never forget it.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="border-b border-[#d9362b] bg-[#d9362b] px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
          Weekly lecture intelligence · built from the room, not just the slides
        </div>
        <header className="border-b border-black/80 bg-[#f5f0e7]/95">
          <div className="page-shell flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <Link href="/" className="font-editorial text-xl font-bold tracking-tight sm:text-3xl">
              LECTUREBRIEF
            </Link>
            <AuthStatus />
            <nav className="order-3 flex w-full items-center gap-5 border-t border-[#c9c1b4] pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] sm:order-2 sm:w-auto sm:border-0 sm:pt-0">
              <Link href="/">Latest</Link>
              <Link href="/archive">Archive</Link>
              <Link href="/build">Build</Link>
              <Link href="/prompts">Prompts</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-black/80 py-8">
          <div className="page-shell flex flex-col gap-2 text-xs text-[#6f6a61] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-editorial text-lg font-bold text-[#171512]">LECTUREBRIEF</p>
              <p>What mattered in the room, organized for the week ahead.</p>
            </div>
            <p>Lecture notes · build ideas · tested prompts</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

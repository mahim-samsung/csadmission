import Link from "next/link";
import { AppLogoIcon } from "@/components/ui/AppLogo";

const navLinks = [
  { label: "Universities", href: "/universities" },
  { label: "Programs", href: "/programs" },
  { label: "Crawler", href: "/crawler" },
  { label: "Chat", href: "/chat" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 shadow-sm shadow-brand-900/30 transition-all duration-200 group-hover:scale-105 group-hover:shadow-brand-700/40 group-hover:shadow-md">
            <AppLogoIcon size={22} color="white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-slate-900">CS Admission</span>
            <span className="text-[10px] font-medium text-brand-600 -mt-0.5">Intelligence</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/chat"
          className="btn-primary text-xs px-3 py-1.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Ask AI
        </Link>
      </div>
    </header>
  );
}

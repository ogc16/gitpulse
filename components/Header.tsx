"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Link as LinkIcon, Briefcase, Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

const themeListeners = new Set<() => void>();
const subscribeTheme = (onStoreChange: () => void) => {
  themeListeners.add(onStoreChange);
  return () => {
    themeListeners.delete(onStoreChange);
  };
};
const getThemeSnapshot = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
const getServerThemeSnapshot = (): Theme => "dark";

function GithubBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a11 11 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export default function Header({ active }: { active: "scan" | "jobs" }) {
  const [copied, setCopied] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.toggleAttribute("data-theme", next === "light");
    try {
      localStorage.setItem("gp-theme", next);
    } catch {
      /* ignore */
    }
    themeListeners.forEach((listener) => listener());
  };

  const navItem = (href: string, label: string, icon: React.ReactNode, key: "scan" | "jobs") => (
    <Link
      href={href}
      className={`group relative flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition ${
        active === key ? "text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
      {active === key && (
        <span className="absolute inset-x-2.5 -bottom-px h-px bg-gradient-to-r from-transparent via-green-400/70 to-transparent" />
      )}
      {active === key && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-0.5" aria-hidden="true" />}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--page)]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-[7px] rounded-[10px] bg-gradient-to-br from-green-600/50 to-green-900/85 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              <GithubBrandIcon className="w-[18px] h-[18px] text-[#fff]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <Link
              href="/"
              className="font-bold text-[15px] tracking-tight text-white hover:text-green-300 transition-colors"
            >
              GitPulse
            </Link>
            <span className="hidden sm:inline text-xs text-slate-500 font-light tracking-tight">
              Profile Intelligence
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-[5px] bg-white/[0.06] text-green-300/90 ring-1 ring-white/10 font-semibold tracking-[0.12em]">
              PRO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1 mr-2 border-r border-white/[0.07] pr-3">
            {navItem("/", "Scan", <GithubBrandIcon className="w-3.5 h-3.5 opacity-80" />, "scan")}
            {navItem("/jobs", "Tracker", <Briefcase className="w-3.5 h-3.5 opacity-80" />, "jobs")}
          </nav>
          <button
            onClick={toggleTheme}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <Moon className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
          <button
            onClick={copyLink}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <LinkIcon className="w-3.5 h-3.5 opacity-70" />
            <span>{copied ? "Copied" : "Share"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
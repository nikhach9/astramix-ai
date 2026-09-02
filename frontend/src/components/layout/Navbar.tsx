"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/beton-kayak", label: "BetonKayak Armenia", highlight: true },
  { href: "/predict", label: "Predict Strength" },
  { href: "/optimize", label: "Optimize Mix" },
  { href: "/compare", label: "Model Comparison" },
  { href: "/report", label: "Report Preview" },
  { href: "/about", label: "About Research" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper-raised sticky top-0 z-50 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-blueprint-600 text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs group-hover:bg-blueprint-700 transition-colors">
            A
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tracking-tight text-ink">AstraMix</span>
            <span className="font-mono text-xs uppercase tracking-wider text-blueprint-600 font-extrabold">
              AI
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 border ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blueprint-100 text-blueprint-800 font-bold"
                    : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

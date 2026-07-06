"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Predict Strength" },
  { href: "/optimize", label: "Optimize Mix" },
  { href: "/compare", label: "Model Comparison" },
  { href: "/report", label: "Report Preview" },
  { href: "/about", label: "About Research" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-ink">AstraMix</span>
          <span className="font-mono text-xs uppercase tracking-wide2 text-blueprint-600">
            AI
          </span>
        </Link>

        <nav className="hidden gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-blueprint-50 text-blueprint-700"
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

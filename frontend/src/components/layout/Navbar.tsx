"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Store, Menu, X, ArrowRight, Sliders } from "lucide-react";
import { AstraMixLogo } from "@/components/layout/AstraMixLogo";

const PRIMARY_SECTIONS = [
  {
    href: "/mix-lab",
    label: "Mix Lab",
    sublabel: "Predict & Optimize",
    icon: FlaskConical,
    matchPaths: ["/mix-lab", "/mix-lab/predict", "/mix-lab/optimize", "/predict", "/optimize", "/report"],
  },
  {
    href: "/materials-market",
    label: "Materials Market",
    sublabel: "100-Country Directory",
    icon: Store,
    matchPaths: ["/materials-market"],
  },
];

const SECONDARY_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/mix-lab/predict", label: "Predict Strength" },
  { href: "/mix-lab/optimize", label: "Optimize Mix" },
  { href: "/report", label: "Report" },
  { href: "/projects/astramix", label: "Research & Provenance" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#D8DFDF] bg-[#FFFFFF]/95 backdrop-blur-md transition-all shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center group">
          <AstraMixLogo iconSize={36} showTagline={true} />
        </Link>

        {/* Two Primary Section Pills + Secondary Links */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Main Navigation">
          <div className="flex items-center gap-1.5 rounded-xl bg-[#EFECE4] p-1 border border-[#D8DFDF]">
            {PRIMARY_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = sec.matchPaths.includes(pathname);
              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs transition-all ${
                    active
                      ? "bg-[#FFFFFF] text-[#176B65] font-bold shadow-xs"
                      : "text-[#172D44] hover:text-[#176B65] font-semibold"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{sec.label}</span>
                  <span className="hidden lg:inline text-[10px] font-normal text-[#536574]">
                    · {sec.sublabel}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[#D8DFDF] mx-1" />

          {SECONDARY_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/mix-lab/predict" && pathname === "/predict") ||
              (item.href === "/mix-lab/optimize" && pathname === "/optimize");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-[#E6F4EC] text-[#176B65] font-bold"
                    : "text-[#536574] hover:bg-[#EFECE4] hover:text-[#172D44]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Primary Action */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/materials-market"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#176B65] hover:bg-[#10564F] text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-all"
          >
            <span>Materials Market</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#172D44] hover:bg-[#EFECE4] transition-colors"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D8DFDF] bg-[#FFFFFF] px-4 py-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#D8DFDF]">
            {PRIMARY_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = sec.matchPaths.includes(pathname);
              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col gap-1 rounded-xl border p-3 text-xs font-bold ${
                    active
                      ? "border-[#176B65] bg-[#E6F4EC] text-[#176B65]"
                      : "border-[#D8DFDF] text-[#172D44]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-[#176B65]" />
                    <span>{sec.label}</span>
                  </div>
                  <span className="text-[11px] font-normal text-[#536574]">
                    {sec.sublabel}
                  </span>
                </Link>
              );
            })}
          </div>
          {SECONDARY_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-lg px-3.5 py-2 text-sm font-semibold ${
                  active
                    ? "bg-[#E6F4EC] text-[#176B65] font-bold"
                    : "text-[#172D44] hover:bg-[#EFECE4]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

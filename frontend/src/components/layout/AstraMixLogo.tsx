"use client";

import React from "react";

interface AstraMixLogoProps {
  /** Icon width/height in pixels. Default: 36 */
  iconSize?: number;
  /** Whether to render the 'AstraMix AI' text alongside the icon. Default: true */
  showText?: boolean;
  /** Whether to show the subtitle tagline below the text. Default: false */
  showTagline?: boolean;
  /** Optional extra CSS classes for the outer wrapper */
  className?: string;
  /** Explicit text color theme override: 'light' (dark text), 'dark' (light text), or 'auto' (theme-aware) */
  theme?: "light" | "dark" | "auto";
}

/**
 * Official AstraMix AI Brand Mark & Logo
 * 
 * Accurately vectorized from the official brand identity:
 * - Left mint/emerald green diagonal leg (#2BC089)
 * - Upper teal facet / shoulder (#14A08E)
 * - Right deep navy leg (#0B2545 / dark-mode adjusted)
 * - Center bottom crossbar triangle (#0B2545 / dark-mode adjusted)
 */
export function AstraMixIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      {/* Left Mint/Emerald Green Leg */}
      <polygon points="4,96 50,4 50,38 26,96" fill="#2BC089" />
      {/* Top Teal Shoulder Facet */}
      <polygon points="50,4 67,38 50,38" fill="#14A08E" />
      {/* Right Deep Navy Leg */}
      <polygon points="50,38 67,38 96,96 74,96" fill="#102B46" />
      {/* Center Bottom Navy Triangle */}
      <polygon points="50,60 35,96 65,96" fill="#102B46" />
    </svg>
  );
}

export function AstraMixLogo({
  iconSize = 36,
  showText = true,
  showTagline = false,
  className = "",
  theme = "auto",
}: AstraMixLogoProps) {
  // AstraMix wordmark is #102B46 (deep navy) ensuring crisp visibility on white/light backgrounds
  // in both light and dark OS themes.
  const textColorClass =
    theme === "dark"
      ? "text-white"
      : "text-[#102B46]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <AstraMixIcon size={iconSize} />

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className={`text-xl font-black tracking-tight ${textColorClass}`}>
              AstraMix
            </span>
            <span className="text-xl font-bold tracking-tight text-[#0284C7]">
              AI
            </span>
          </div>

          {showTagline && (
            <span className="text-[10px] font-medium text-[#536574] mt-1 hidden sm:inline">
              Mix Lab &amp; 100-Country Materials Market
            </span>
          )}
        </div>
      )}
    </div>
  );
}

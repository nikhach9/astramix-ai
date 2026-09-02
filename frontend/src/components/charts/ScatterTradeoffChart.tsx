"use client";

import React from "react";
import { CandidateMix } from "@/types/concrete";
import { Sparkles } from "lucide-react";

interface ScatterTradeoffChartProps {
  candidates: CandidateMix[];
  selectedId: string;
  onSelectCandidate: (id: string) => void;
}

export const ScatterTradeoffChart: React.FC<ScatterTradeoffChartProps> = ({
  candidates,
  selectedId,
  onSelectCandidate,
}) => {
  if (!candidates || candidates.length === 0) return null;

  const validCandidates = candidates.filter((c) => c.cost.costPerM3AMD > 0 && c.carbon.co2PerM3 > 0);
  if (validCandidates.length === 0) return null;

  const costs = validCandidates.map((c) => c.cost.costPerM3AMD);
  const carbons = validCandidates.map((c) => c.carbon.co2PerM3);

  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minCarbon = Math.min(...carbons);
  const maxCarbon = Math.max(...carbons);

  // Add 10% padding around plot range
  const costPadding = Math.max(1000, (maxCost - minCost) * 0.15);
  const carbonPadding = Math.max(10, (maxCarbon - minCarbon) * 0.15);

  const xMin = Math.max(0, minCost - costPadding);
  const xMax = maxCost + costPadding;
  const yMin = Math.max(0, minCarbon - carbonPadding);
  const yMax = maxCarbon + carbonPadding;

  const width = 600;
  const height = 320;
  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingRight = 30;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const getX = (cost: number) => {
    if (xMax === xMin) return paddingLeft + plotWidth / 2;
    return paddingLeft + ((cost - xMin) / (xMax - xMin)) * plotWidth;
  };

  const getY = (carbon: number) => {
    if (yMax === yMin) return paddingTop + plotHeight / 2;
    // Y is inverted in SVG (0 is top)
    return paddingTop + plotHeight - ((carbon - yMin) / (yMax - yMin)) * plotHeight;
  };

  const formatAMD = (val: number) => Math.round(val).toLocaleString("en-US");

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Cost vs. Embodied CO₂ Engineering Trade-Off Map</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Pareto Frontier
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click points to inspect trade-off mixes. Ideal direction is bottom-left (lower cost & lower carbon).
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block"></span>
            <span>Recommended</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
            <span>Feasible</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Background Grid Lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#e2e8f0" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e2e8f0" strokeDasharray="3 3" />

          {/* Ideal Direction Arrow (Bottom Left) */}
          <g transform={`translate(${paddingLeft + 35}, ${height - paddingBottom - 35})`}>
            <line x1="40" y1="40" x2="10" y2="10" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
            <polygon points="8,15 10,8 17,10" fill="#10b981" />
            <text x="45" y="45" fontSize="10" fontWeight="bold" fill="#059669">
              Ideal Zone (Low Cost & CO₂)
            </text>
          </g>

          {/* Scatter Points */}
          {validCandidates.map((c) => {
            const cx = getX(c.cost.costPerM3AMD);
            const cy = getY(c.carbon.co2PerM3);
            const isSelected = c.id === selectedId;
            const isBest = c.badges.isBestOverall;

            let fillColor = "#10b981"; // green
            if (isBest) fillColor = "#4f46e5"; // indigo
            if (!c.isFeasible) fillColor = "#f43f5e"; // rose

            return (
              <g key={c.id} className="cursor-pointer transition-all hover:opacity-90" onClick={() => onSelectCandidate(c.id)}>
                {/* Selection Ring */}
                {isSelected && (
                  <circle cx={cx} cy={cy} r="14" fill="none" stroke={fillColor} strokeWidth="2" opacity="0.6" className="animate-pulse" />
                )}

                {/* Candidate Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isBest ? "8" : "6"}
                  fill={fillColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-md"
                />

                {/* Badge Label above point */}
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isSelected || isBest ? "bold" : "normal"}
                  fill={isSelected ? "#1e1b4b" : "#475569"}
                >
                  {isBest ? "⭐ " : ""}{c.title.split(" ")[0]}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748b">
            Cost per m³ (֏ AMD) →
          </text>
          <text
            x={16}
            y={height / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#64748b"
            transform={`rotate(-90 16 ${height / 2})`}
          >
            ← Embodied CO₂ (kg/m³)
          </text>

          {/* Tick values */}
          <text x={paddingLeft} y={height - 22} fontSize="9" fill="#94a3b8">
            {formatAMD(Math.round(xMin))} ֏
          </text>
          <text x={width - paddingRight - 40} y={height - 22} fontSize="9" fill="#94a3b8">
            {formatAMD(Math.round(xMax))} ֏
          </text>
          <text x={paddingLeft - 8} y={paddingTop + 10} textAnchor="end" fontSize="9" fill="#94a3b8">
            {Math.round(yMax)} kg
          </text>
          <text x={paddingLeft - 8} y={height - paddingBottom} textAnchor="end" fontSize="9" fill="#94a3b8">
            {Math.round(yMin)} kg
          </text>
        </svg>
      </div>
    </div>
  );
};

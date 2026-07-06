/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";

interface ShowcaseImageProps {
  src: string;
  alt: string;
  mockupType: "dashboard" | "prediction" | "optimization" | "report";
}

export function ShowcaseImage({ src, alt, mockupType }: ShowcaseImageProps) {
  const [hasError, setHasError] = useState(false);

  // Fallback rich mockup renderers
  const renderMockup = () => {
    switch (mockupType) {
      case "dashboard":
        return (
          <div className="flex flex-col justify-between w-full h-full bg-paper-raised p-4 font-sans text-xs select-none">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                <span className="font-mono text-xxs font-bold text-blueprint-600 uppercase tracking-wider">Mix Parameter Sliders</span>
                <span className="text-[10px] text-ink-faint">Input Controls</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Cement (kg/m³)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-line rounded-full relative"><div className="absolute left-0 top-0 h-full w-2/3 bg-blueprint-500 rounded-full"></div></div>
                    <span className="font-mono bg-paper px-1.5 py-0.5 rounded border border-line text-ink">350</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Water (kg/m³)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-line rounded-full relative"><div className="absolute left-0 top-0 h-full w-1/2 bg-blueprint-500 rounded-full"></div></div>
                    <span className="font-mono bg-paper px-1.5 py-0.5 rounded border border-line text-ink">175</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Fly Ash (kg/m³)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-line rounded-full relative"><div className="absolute left-0 top-0 h-full w-0 bg-blueprint-500 rounded-full"></div></div>
                    <span className="font-mono bg-paper px-1.5 py-0.5 rounded border border-line text-ink">0</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Curing Age (days)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-line rounded-full relative"><div className="absolute left-0 top-0 h-full w-[80%] bg-blueprint-500 rounded-full"></div></div>
                    <span className="font-mono bg-paper px-1.5 py-0.5 rounded border border-line text-ink">28</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-blueprint-600 text-white rounded-sm text-center py-2 font-mono text-xxs font-bold uppercase tracking-wider shadow-sm select-none">
              Run Prediction
            </div>
          </div>
        );

      case "prediction":
        return (
          <div className="flex flex-col justify-between w-full h-full bg-paper-raised p-4 font-sans text-xs select-none">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                <span className="font-mono text-xxs font-bold text-blueprint-600 uppercase tracking-wider">Inference Output</span>
                <span className="text-[10px] text-ink-faint">XGBoost v0.1</span>
              </div>
              <div className="text-center py-2">
                <div className="text-xxs uppercase tracking-wider text-ink-faint font-mono">Predicted Compressive Strength</div>
                <div className="text-2xl font-bold text-blueprint-600 font-mono mt-0.5">52.80 MPa</div>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-line pt-2 text-[10px] font-mono text-ink-muted">
              <div className="flex justify-between">
                <span>Water/Cement Ratio:</span>
                <span className="font-bold text-ink">0.490</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Model Error:</span>
                <span className="font-bold text-ink">±4.62 MPa (RMSE)</span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-line/50">
                <span>Envelope Verification:</span>
                <span className="bg-signal-success/10 border border-signal-success/30 text-signal-success px-1.5 py-0.5 rounded-sm uppercase text-[8px] font-bold">
                  In Training Envelope
                </span>
              </div>
            </div>
          </div>
        );

      case "optimization":
        return (
          <div className="flex flex-col justify-between w-full h-full bg-paper-raised p-4 font-sans text-xs select-none">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-1 mb-2">
                <span className="font-mono text-xxs font-bold text-blueprint-600 uppercase tracking-wider">SLSQP Solver Results</span>
                <span className="bg-blueprint-100 text-blueprint-800 text-[8px] font-mono font-bold px-1 py-0.5 rounded">Success</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mb-2">
                <div className="bg-paper p-1.5 border border-line rounded">
                  <div className="text-ink-faint text-[8px] uppercase">Target Strength</div>
                  <div className="text-ink font-bold mt-0.5">40.0 MPa</div>
                </div>
                <div className="bg-paper p-1.5 border border-line rounded">
                  <div className="text-ink-faint text-[8px] uppercase">Optimized Cement</div>
                  <div className="text-ink font-bold mt-0.5">288.5 kg/m³</div>
                </div>
              </div>
            </div>
            <div className="space-y-1 border-t border-line pt-2 text-[10px] font-mono text-ink-muted">
              <div className="flex justify-between">
                <span>Estimated CO₂ Footprint:</span>
                <span className="font-bold text-rust-600">265.4 kg/m³</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Mix Cost:</span>
                <span className="font-bold text-signal-success">$56.80 / m³</span>
              </div>
            </div>
          </div>
        );

      case "report":
        return (
          <div className="flex flex-col justify-between w-full h-full bg-paper-raised p-4 font-sans text-xs select-none">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                <span className="font-mono text-xxs font-bold text-blueprint-600 uppercase tracking-wider">Validation Report</span>
                <span className="text-[10px] text-ink-faint">Model Card</span>
              </div>
              <div className="space-y-1 text-[10px] font-mono text-ink-muted">
                <div className="flex justify-between">
                  <span>Selected Model:</span>
                  <span className="font-bold text-ink">XGBoost Regressor</span>
                </div>
                <div className="flex justify-between">
                  <span>R² Coefficient:</span>
                  <span className="font-bold text-blueprint-600">0.917</span>
                </div>
                <div className="flex justify-between">
                  <span>RMSE / MAE:</span>
                  <span className="font-bold text-ink">4.62 / 3.03 MPa</span>
                </div>
              </div>
            </div>
            <div className="border-t border-line pt-2 text-[9px] text-ink-faint leading-tight italic">
              <strong>Limitations Card:</strong> Model predictions reflect physical concrete testing limits and cannot bypass lab split cylinder validation breaks before placement.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative aspect-video w-full rounded-sm overflow-hidden border border-line bg-paper flex items-center justify-center">
      {hasError ? (
        renderMockup()
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        />
      )}
    </div>
  );
}

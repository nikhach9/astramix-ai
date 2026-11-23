"use client";

import React, { Suspense } from "react";
import { MaterialsMarketWorkspace } from "@/components/MaterialsMarketWorkspace";

export default function MaterialsMarketPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-slate-500">
          Loading Materials Market...
        </div>
      }
    >
      <MaterialsMarketWorkspace />
    </Suspense>
  );
}

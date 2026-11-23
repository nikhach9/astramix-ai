"use client";

import React from "react";
import { MixLabWorkspace } from "@/components/MixLabWorkspace";

export const MixCalculator: React.FC = () => {
  return <MixLabWorkspace initialMode="predict" />;
};

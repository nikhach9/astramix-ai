"use client";

import { useCallback, useState } from "react";
import { ApiRequestState } from "@/types/api";

/**
 * Wraps a single API function (e.g. predictStrength, optimizeMix) with
 * loading/data/error state. Each page owns its own instance of this hook —
 * there is no global store. Cross-page data (for the Report Preview page)
 * goes through ReportContext instead, not through this hook.
 */
export function usePrediction<TInput, TOutput>(
  requestFn: (input: TInput) => Promise<TOutput>
) {
  const [state, setState] = useState<ApiRequestState<TOutput>>({
    loading: false,
    data: null,
    error: null,
  });

  const run = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setState({ loading: true, data: null, error: null });
      try {
        const result = await requestFn(input);
        setState({ loading: false, data: result, error: null });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, data: null, error: message });
        return null;
      }
    },
    [requestFn]
  );

  const reset = useCallback(() => {
    setState({ loading: false, data: null, error: null });
  }, []);

  return { ...state, run, reset };
}

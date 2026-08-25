"use client";

import { useCallback, useState } from "react";
import { ApiRequestState } from "@/types/api";
import { ApiError } from "@/lib/api/client";

/**
 * Wraps a single API function (e.g. predictStrength, optimizeMix) with
 * loading/data/error/fieldErrors state.
 */
export function usePrediction<TInput, TOutput>(
  requestFn: (input: TInput) => Promise<TOutput>
) {
  const [state, setState] = useState<ApiRequestState<TOutput>>({
    loading: false,
    data: null,
    error: null,
    fieldErrors: {},
  });

  const run = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setState({ loading: true, data: null, error: null, fieldErrors: {} });
      try {
        const result = await requestFn(input);
        setState({ loading: false, data: result, error: null, fieldErrors: {} });
        return result;
      } catch (err) {
        if (err instanceof ApiError) {
          setState({
            loading: false,
            data: null,
            error: err.message,
            fieldErrors: err.fieldErrors || {},
          });
        } else {
          const message = err instanceof Error ? err.message : "Unknown error";
          setState({ loading: false, data: null, error: message, fieldErrors: {} });
        }
        return null;
      }
    },
    [requestFn]
  );

  const setErrors = useCallback(
    (fieldErrors: Record<string, string>, mainError?: string) => {
      setState((prev) => ({
        ...prev,
        error: mainError || "Please correct the invalid fields below.",
        fieldErrors,
      }));
    },
    []
  );

  const clearFieldError = useCallback((field: string) => {
    setState((prev) => {
      if (!prev.fieldErrors?.[field]) return prev;
      const nextFieldErrors = { ...prev.fieldErrors };
      delete nextFieldErrors[field];
      const hasRemaining = Object.keys(nextFieldErrors).length > 0;
      return {
        ...prev,
        error: hasRemaining ? prev.error : null,
        fieldErrors: nextFieldErrors,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, data: null, error: null, fieldErrors: {} });
  }, []);

  return { ...state, run, setErrors, clearFieldError, reset };
}

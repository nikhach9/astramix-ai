/**
 * Local request state for a single async API call, as tracked by
 * `usePrediction`.
 */
export interface ApiRequestState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
  fieldErrors?: Record<string, string>;
}

export const INITIAL_REQUEST_STATE: ApiRequestState<never> = {
  loading: false,
  data: null,
  error: null,
  fieldErrors: {},
};

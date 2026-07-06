/**
 * Local request state for a single async API call, as tracked by
 * `usePrediction`. This is intentionally the only "envelope" type in the
 * app — the backend returns bare JSON bodies (no `{ data, error }` wrapper),
 * so there is no `ApiResponse<T>` type here. If the backend ever starts
 * wrapping responses, decode that wrapper inside `lib/api/client.ts` only —
 * components and hooks should not need to change.
 */
export interface ApiRequestState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}

export const INITIAL_REQUEST_STATE: ApiRequestState<never> = {
  loading: false,
  data: null,
  error: null,
};

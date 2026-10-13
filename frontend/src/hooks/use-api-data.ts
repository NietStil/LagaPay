import { useEffect, useRef, useState, type DependencyList } from 'react';
import { useIsFocused } from 'expo-router';

import { foutmelding } from '@/lib/api/lagapay';

export interface ApiData<T> {
  /** Last successful result; `null` until the first load for the current deps succeeds. */
  data: T | null;
  /** Dutch error message (via `foutmelding`) when the latest request failed, else `null`. */
  error: string | null;
  /** True while there is no data yet for the current deps (first load, deps change, `reload()` after an error). */
  loading: boolean;
  /** True during a pull-to-refresh started with `refresh()`. */
  refreshing: boolean;
  /** Fetch again; shows `loading` only when there is no data yet. Use for "Opnieuw proberen". */
  reload: () => void;
  /** Fetch again for pull-to-refresh (sets `refreshing`). Pass to `<Screen onRefresh>`. */
  refresh: () => void;
  /** Replace `data` locally, e.g. with the response of a mutation. */
  setData: (data: T) => void;
}

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/**
 * Loads data for a screen and keeps it fresh.
 *
 * - Fetches when the screen gains focus (and again every time it regains focus, silently).
 * - Refetches from scratch when `deps` change (like `useEffect` deps; include everything `fetcher` uses).
 * - Only the latest request may update the state, so fast param changes can't show stale results.
 *
 * ```tsx
 * const { data, error, loading, refreshing, reload, refresh } =
 *   useApiData(() => getEvenementOverzicht(id), [id]);
 * if (loading) return <Screen><LoadingState /></Screen>;
 * if (!data) return <Screen><ErrorState message={error ?? ''} onRetry={reload} /></Screen>;
 * ```
 */
export function useApiData<T>(fetcher: () => Promise<T>, deps: DependencyList = []): ApiData<T> {
  const isFocused = useIsFocused();
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, refreshing: false });

  const fetcherRef = useRef(fetcher);
  const verzoekRef = useRef(0);
  const vorigeDepsRef = useRef<DependencyList | null>(null);

  // Always call the latest fetcher (it closes over the latest props/state).
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const laad = () => {
    const verzoek = ++verzoekRef.current;
    fetcherRef.current().then(
      (data) => {
        if (verzoek !== verzoekRef.current) return;
        setState({ data, error: null, loading: false, refreshing: false });
      },
      (err: unknown) => {
        if (verzoek !== verzoekRef.current) return;
        setState((s) => ({ data: s.data, error: foutmelding(err), loading: false, refreshing: false }));
      },
    );
  };

  useEffect(() => {
    if (!isFocused) return;

    const vorige = vorigeDepsRef.current;
    const gewijzigd =
      vorige !== null &&
      (vorige.length !== deps.length || deps.some((dep, i) => !Object.is(dep, vorige[i])));
    vorigeDepsRef.current = deps;

    if (gewijzigd) {
      // Different params: don't show the previous result while the new one loads.
      setState({ data: null, error: null, loading: true, refreshing: false });
    }
    laad();
    // `deps` is the caller's dependency list, spread on purpose (same contract as useEffect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, ...deps]);

  const reload = () => {
    setState((s) => ({ ...s, error: null, loading: s.data === null }));
    laad();
  };

  const refresh = () => {
    setState((s) => ({ ...s, refreshing: true }));
    laad();
  };

  const setData = (data: T) => {
    verzoekRef.current++; // a running request must not overwrite this
    setState({ data, error: null, loading: false, refreshing: false });
  };

  return { ...state, reload, refresh, setData };
}

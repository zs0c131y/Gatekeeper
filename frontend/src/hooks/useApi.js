import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for API calls with loading and error states.
 *
 * - Initial fetch sets loading=true (shows skeleton).
 * - Background refetches (via the returned refetch fn) do NOT set
 *   loading=true when data is already present, so the UI stays visible
 *   and just silently swaps in fresh data.
 *
 * @param {Function} apiCall - The API function to call
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} { data, loading, error, refetch }
 */
export function useApi(apiCall, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep the latest apiCall in a ref so refetch always calls the
  // current version without needing to be in the dep array.
  const apiCallRef = useRef(apiCall);
  useEffect(() => {
    apiCallRef.current = apiCall;
  });

  // Stable refetch: only shows loading skeleton when there is no data yet.
  const refetch = useCallback(async () => {
    try {
      setError(null);
      const result = await apiCallRef.current();
      setData(result);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCallRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch };
}

// useFetch.js - runs a service call and returns { data, loading, error, reload }.
// Usage: const { data, loading, error, reload } = useFetch(() => appointmentService.list(), []);
// The call runs again when anything in `deps` changes, or when reload() is called.
import { useEffect, useState } from 'react';

export default function useFetch(serviceFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; // ignore results that arrive after the page changed
    setState((s) => ({ ...s, loading: true, error: null }));
    serviceFn().then((data) => live && setState({ data, loading: false, error: null })).catch((error) => live && setState({ data: null, loading: false, error }));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

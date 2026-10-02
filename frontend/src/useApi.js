import { useEffect, useState } from "react";
import { api } from "./api";

export function useApi(path) {
  const [state, setState] = useState({ path: null, data: null, error: "" });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api(path)
      .then((data) => {
        if (!cancelled) setState({ path, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ path, data: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const ready = state.path === path;
  return {
    data: ready ? state.data : null,
    error: ready ? state.error : "",
    loading: Boolean(path) && !ready,
  };
}
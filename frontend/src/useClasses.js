import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./AuthContext";

export function useClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const path = user.role === "TEACHER" ? "/classes/mine" : "/classes";
    api(path)
      .then(setClasses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.role]);

  return { classes, loading, error };
}
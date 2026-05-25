// This hook fetches all custom roles from the API
import { useEffect, useState } from "react";

export function useCustomRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/roles")
      .then((res) => res.json())
      .then((data) => {
        setRoles(data.roles || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { roles, loading, error };
}

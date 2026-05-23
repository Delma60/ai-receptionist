"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/types";

/**
 * Subscribes to the current tenant's Firestore document.
 * Pass the tenantId from your auth provider (Clerk userId / org ID).
 */
export function useTenant(tenantId: string | null | undefined) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = onSnapshot(
      doc(db, "tenants", tenantId),
      (snap) => {
        if (snap.exists()) {
          setTenant({ id: snap.id, ...snap.data() } as Tenant);
        } else {
          setTenant(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useTenant]", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  return { tenant, loading, error };
}
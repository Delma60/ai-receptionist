"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Call } from "@/types";

const PAGE_SIZE = 20;

/**
 * Subscribes to the most recent PAGE_SIZE calls for a tenant.
 * Also exposes `loadMore` for pagination.
 */
export function useCalls(tenantId: string | null | undefined) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setCalls([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "tenants", tenantId, "calls"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Call[];
        setCalls(docs);
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useCalls]", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  const loadMore = useCallback(async () => {
    if (!tenantId || !lastDoc) return;

    const q = query(
      collection(db, "tenants", tenantId, "calls"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(q);
    const more = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[];
    setCalls((prev) => [...prev, ...more]);
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }, [tenantId, lastDoc]);

  return { calls, loading, error, hasMore, loadMore };
}
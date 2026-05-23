"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Agent } from "@/types";

/**
 * Subscribes to all agents for a tenant in real time,
 * and exposes create / update / remove helpers.
 */
export function useAgents(tenantId: string | null | undefined) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "tenants", tenantId, "agents"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAgents(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agent))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useAgents]", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  const createAgent = useCallback(
    async (data: Omit<Agent, "id" | "createdAt" | "tenantId">) => {
      if (!tenantId) throw new Error("No tenantId");
      return addDoc(collection(db, "tenants", tenantId, "agents"), {
        ...data,
        tenantId,
        createdAt: serverTimestamp(),
      });
    },
    [tenantId]
  );

  const updateAgent = useCallback(
    async (agentId: string, data: Partial<Agent>) => {
      if (!tenantId) throw new Error("No tenantId");
      return updateDoc(
        doc(db, "tenants", tenantId, "agents", agentId),
        data
      );
    },
    [tenantId]
  );

  const removeAgent = useCallback(
    async (agentId: string) => {
      if (!tenantId) throw new Error("No tenantId");
      return deleteDoc(doc(db, "tenants", tenantId, "agents", agentId));
    },
    [tenantId]
  );

  return { agents, loading, error, createAgent, updateAgent, removeAgent };
}
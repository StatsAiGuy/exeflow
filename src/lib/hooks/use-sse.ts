"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { ExeflowEvent } from "@/types/events";

export function useSSE(projectId: string | null) {
  const [events, setEvents] = useState<ExeflowEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!projectId) return;

    const url = `/api/projects/${projectId}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ExeflowEvent;
        setEvents((prev) => [...prev.slice(-99), data]);
      } catch {
        // Invalid event data
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      setTimeout(() => connect(), 3000);
    };
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}

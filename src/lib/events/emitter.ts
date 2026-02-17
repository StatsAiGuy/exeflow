import type { EventType, ExeflowEvent } from "@/types/events";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";

type EventListener = (event: ExeflowEvent) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();

  on(eventType: EventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    return () => this.listeners.get(eventType)?.delete(listener);
  }

  onAll(listener: EventListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  onProject(projectId: string, listener: EventListener): () => void {
    const wrappedListener: EventListener = (event) => {
      if (event.projectId === projectId) {
        listener(event);
      }
    };
    this.globalListeners.add(wrappedListener);
    return () => this.globalListeners.delete(wrappedListener);
  }

  emit(
    eventType: EventType,
    projectId: string | null,
    data?: Record<string, unknown>,
    agentId?: string | null,
  ): ExeflowEvent {
    const event: ExeflowEvent = {
      id: 0,
      projectId,
      eventType,
      agentId: agentId ?? null,
      data: data ?? null,
      timestamp: new Date().toISOString(),
    };

    // Persist to database
    try {
      const db = getDb();
      const result = db
        .prepare(
          `INSERT INTO events (project_id, event_type, agent_id, data, timestamp)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          event.projectId,
          event.eventType,
          event.agentId,
          data ? JSON.stringify(data) : null,
          event.timestamp,
        );
      event.id = result.lastInsertRowid as number;
    } catch {
      // Don't let DB errors block event emission
    }

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch {
          // Don't let listener errors propagate
        }
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors propagate
      }
    }

    return event;
  }

  getRecentEvents(
    projectId: string,
    limit = 50,
    sinceId?: number,
  ): ExeflowEvent[] {
    const db = getDb();
    const query = sinceId
      ? `SELECT * FROM events WHERE project_id = ? AND id > ? ORDER BY id DESC LIMIT ?`
      : `SELECT * FROM events WHERE project_id = ? ORDER BY id DESC LIMIT ?`;

    const params = sinceId
      ? [projectId, sinceId, limit]
      : [projectId, limit];

    const rows = db.prepare(query).all(...params) as Array<{
      id: number;
      project_id: string;
      event_type: string;
      agent_id: string | null;
      data: string | null;
      timestamp: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      eventType: row.event_type as EventType,
      agentId: row.agent_id,
      data: row.data ? JSON.parse(row.data) : null,
      timestamp: row.timestamp,
    }));
  }
}

export const eventBus = new EventBus();

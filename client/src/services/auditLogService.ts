import { supabase } from "../lib/supabaseClient";
import type { AuditLog } from "../types/superAdmin";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

const resolveActorId = async () => {
  const client = requireSupabase();
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
};

export const auditLogService = {
  async listAuditLogs(params?: {
    actorId?: string | null;
    limit?: number;
    entityType?: string;
  }): Promise<AuditLog[]> {
    const client = requireSupabase();
    let query = client
      .from("audit_logs")
      .select("id, entity_type, entity_id, action, actor_id, timestamp, details")
      .order("timestamp", { ascending: false });

    if (params?.actorId) {
      query = query.eq("actor_id", params.actorId);
    }
    if (params?.entityType) {
      query = query.eq("entity_type", params.entityType);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as AuditLog[];
  },

  async recordAuditLog(payload: {
    entityType: string;
    entityId?: string | null;
    action: string;
    actorId?: string | null;
    details?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const client = requireSupabase();
      const actorId = payload.actorId ?? (await resolveActorId());
      const { error } = await client.from("audit_logs").insert({
        entity_type: payload.entityType,
        entity_id: payload.entityId ?? null,
        action: payload.action,
        actor_id: actorId,
        details: payload.details ?? null,
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.warn("audit_log_insert_failed", error);
    }
  },
};

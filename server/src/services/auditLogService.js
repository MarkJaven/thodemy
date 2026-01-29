const { supabaseAdmin } = require("../config/supabase");
const { ExternalServiceError } = require("../utils/errors");

/**
 * Write an audit log entry.
 * @param {{entityType: string, entityId?: string|null, action: string, actorId?: string|null, details?: object|null}} payload
 * @returns {Promise<void>}
 */
const recordAuditLog = async ({ entityType, entityId, action, actorId, details }) => {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    entity_type: entityType,
    entity_id: entityId ?? null,
    action,
    actor_id: actorId ?? null,
    details: details ?? null,
  });

  if (error) {
    throw new ExternalServiceError("Unable to write audit log", {
      code: error.code,
      details: error.message,
    });
  }
};

module.exports = { auditLogService: { recordAuditLog } };

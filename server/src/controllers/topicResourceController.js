const { supabaseAdmin } = require("../config/supabase");
const { auditLogService } = require("../services/auditLogService");
const { topicResourceService } = require("../services/topicResourceService");
const { topicService } = require("../services/topicService");
const {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const logger = require("../utils/logger");

const RESOURCE_SELECT_FIELDS =
  "id, topic_id, title, file_name, file_type, file_size, storage_path, uploaded_by, status, deactivated_at, deactivated_by, created_at, updated_at";

const resolveUserRole = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new ExternalServiceError("Unable to verify user role", {
      code: error.code,
      details: error.message,
    });
  }
  return data?.role ?? null;
};

const listTopicResources = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const userId = req.auth?.sub ?? null;
    const requestedStatus = typeof req.query?.status === "string" ? req.query.status : null;

    const role = await resolveUserRole(userId);
    const isAdmin = role === "admin" || role === "superadmin";

    let query = supabaseAdmin
      .from("topic_resources")
      .select(RESOURCE_SELECT_FIELDS)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true });

    if (requestedStatus === "all") {
      if (!isAdmin) {
        query = query.eq("status", "active");
      }
    } else if (requestedStatus === "inactive" || requestedStatus === "active") {
      if (!isAdmin && requestedStatus !== "active") {
        query = query.eq("status", "active");
      } else {
        query = query.eq("status", requestedStatus);
      }
    } else {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;

    if (error) {
      throw new ExternalServiceError("Unable to load topic resources", {
        code: error.code,
        details: error.message,
      });
    }

    return res.json({ resources: data ?? [] });
  } catch (error) {
    return next(error);
  }
};

const createTopicResource = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const { topicId } = req.params;
    const { title } = req.body || {};

    await topicService.getTopicById(topicId);
    topicResourceService.validateResourceFile(req.file);

    const storagePath = topicResourceService.buildResourceStoragePath(
      topicId,
      req.file.originalname
    );

    const upload = await supabaseAdmin.storage
      .from("topic-resources")
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (upload.error) {
      throw new ExternalServiceError("Unable to upload resource file", {
        code: upload.error.statusCode || upload.error.code,
        details: upload.error.message,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("topic_resources")
      .insert({
        topic_id: topicId,
        title: title ? String(title).trim() : null,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        storage_path: storagePath,
        uploaded_by: userId,
      })
      .select(RESOURCE_SELECT_FIELDS)
      .single();

    if (error) {
      const cleanup = await supabaseAdmin.storage
        .from("topic-resources")
        .remove([storagePath]);
      if (cleanup.error) {
        logger.warn("topic_resource_cleanup_failed", {
          topicId,
          storagePath,
          error: cleanup.error.message,
        });
      }
      throw new ExternalServiceError("Unable to save topic resource", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic_resource",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: { topic_id: topicId, file_name: data.file_name },
    });

    return res.status(201).json({ resource: data });
  } catch (error) {
    return next(error);
  }
};

const updateTopicResourceStatus = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const { resourceId } = req.params;
    const nextStatus = req.body?.status;

    if (!["active", "inactive"].includes(nextStatus)) {
      throw new BadRequestError("Status must be active or inactive.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("topic_resources")
      .select("id, status")
      .eq("id", resourceId)
      .maybeSingle();

    if (existingError) {
      throw new ExternalServiceError("Unable to load topic resource", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (!existing) {
      throw new NotFoundError("Topic resource not found.");
    }

    const updates = { status: nextStatus };
    if (nextStatus === "inactive") {
      updates.deactivated_at = new Date().toISOString();
      updates.deactivated_by = userId;
    } else {
      updates.deactivated_at = null;
      updates.deactivated_by = null;
    }

    const { data, error } = await supabaseAdmin
      .from("topic_resources")
      .update(updates)
      .eq("id", resourceId)
      .select(RESOURCE_SELECT_FIELDS)
      .single();

    if (error) {
      throw new ExternalServiceError("Unable to update topic resource status", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic_resource",
      entityId: resourceId,
      action: "status_changed",
      actorId: userId,
      details: { from: existing.status, to: nextStatus },
    });

    return res.json({ resource: data });
  } catch (error) {
    return next(error);
  }
};

const deleteTopicResource = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const { resourceId } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("topic_resources")
      .select("id, topic_id, storage_path, file_name")
      .eq("id", resourceId)
      .maybeSingle();

    if (existingError) {
      throw new ExternalServiceError("Unable to load topic resource", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (!existing) {
      throw new NotFoundError("Topic resource not found.");
    }

    if (existing.storage_path) {
      const removal = await supabaseAdmin.storage
        .from("topic-resources")
        .remove([existing.storage_path]);
      if (removal.error) {
        logger.warn("topic_resource_remove_failed", {
          resourceId,
          storagePath: existing.storage_path,
          error: removal.error.message,
        });
      }
    }

    const { error } = await supabaseAdmin
      .from("topic_resources")
      .delete()
      .eq("id", resourceId);

    if (error) {
      throw new ExternalServiceError("Unable to delete topic resource", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic_resource",
      entityId: resourceId,
      action: "deleted",
      actorId: userId,
      details: {
        topic_id: existing.topic_id,
        file_name: existing.file_name,
      },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const getTopicResourceFile = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const userId = req.auth?.sub ?? null;

    const { data, error } = await supabaseAdmin
      .from("topic_resources")
      .select("storage_path, file_name, status")
      .eq("id", resourceId)
      .maybeSingle();

    if (error) {
      throw new ExternalServiceError("Unable to load topic resource", {
        code: error.code,
        details: error.message,
      });
    }
    if (!data) {
      throw new NotFoundError("Topic resource not found.");
    }
    if (data.status === "inactive") {
      const role = await resolveUserRole(userId);
      if (role !== "admin" && role !== "superadmin") {
        throw new NotFoundError("Topic resource not found.");
      }
    }
    if (!data.storage_path) {
      throw new BadRequestError("Topic resource has no stored file.");
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("topic-resources")
      .createSignedUrl(data.storage_path, 300, { download: data.file_name || undefined });

    if (signedError) {
      throw new ExternalServiceError("Unable to create signed URL", {
        code: signedError.statusCode || signedError.code,
        details: signedError.message,
      });
    }

    return res.json({ file_url: signed?.signedUrl ?? null });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  topicResourceController: {
    listTopicResources,
    createTopicResource,
    updateTopicResourceStatus,
    deleteTopicResource,
    getTopicResourceFile,
  },
};

const { supabaseAdmin } = require("../config/supabase");
const {
  BadRequestError,
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const { auditLogService } = require("../services/auditLogService");
const { topicService } = require("../services/topicService");

const TOPIC_SELECT_FIELDS =
  "id, title, description, link_url, time_allocated, time_unit, pre_requisites, co_requisites, status, certificate_file_url, start_date, end_date, author_id, edited, deleted_at, created_at, updated_at, created_by, updated_by";

const fetchAuthorMap = async (topics) => {
  const authorIds = Array.from(
    new Set(
      topics
        .map((topic) => topic.author_id || topic.created_by)
        .filter(Boolean)
        .map(String)
    )
  );

  if (authorIds.length === 0) {
    return new Map();
  }

  const { data: authors, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, email")
    .in("id", authorIds);

  if (error) {
    throw new ExternalServiceError("Unable to load topic authors", {
      code: error.code,
      details: error.message,
    });
  }

  return new Map((authors ?? []).map((author) => [author.id, author]));
};

const attachAuthors = async (topics) => {
  const authorMap = await fetchAuthorMap(topics);
  return topics.map((topic) => {
    const authorId = topic.author_id || topic.created_by;
    return {
      ...topic,
      author: authorId ? authorMap.get(authorId) ?? null : null,
    };
  });
};

const listTopics = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const userRole = req.userRole;
    let query = supabaseAdmin
      .from("topics")
      .select(TOPIC_SELECT_FIELDS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Only restrict list for ordinary users. Admins and superadmins see all topics.
    if (userRole === "user" && userId) {
      query = query.or(`author_id.eq.${userId},created_by.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new ExternalServiceError("Unable to load topics", {
        code: error.code,
        details: error.message,
      });
    }
    const topics = data ?? [];
    const payload = await attachAuthors(topics);

    return res.json({ topics: payload });
  } catch (error) {
    return next(error);
  }
};

const createTopic = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const userRole = req.userRole;
    const payload = req.body || {};
    const {
      title,
      description,
      link_url,
      time_allocated,
      time_unit,
      certificate_file_url,
      start_date,
      end_date,
      author_id,
    } = payload;

    const trimmedTitle = String(title || "").trim();
    if (!trimmedTitle) {
      throw new BadRequestError("Topic title is required.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("topics")
      .select("id")
      .ilike("title", trimmedTitle)
      .is("deleted_at", null);
    if (existingError) {
      throw new ExternalServiceError("Unable to validate topic title", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (existing && existing.length > 0) {
      throw new ConflictError("A topic with that title already exists.");
    }

    const isSuperAdmin = userRole === "superadmin";
    const topicPayload = {
      title: trimmedTitle,
      description: description ? String(description).trim() : null,
      link_url: link_url ? String(link_url).trim() : null,
      time_allocated,
      time_unit,
      pre_requisites: [],
      co_requisites: [],
      status: "active",
      certificate_file_url: certificate_file_url ? String(certificate_file_url).trim() : null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      author_id: isSuperAdmin ? author_id ?? userId : userId,
      edited: false,
      created_by: userId ?? undefined,
      updated_by: userId ?? undefined,
    };

    const { data, error } = await supabaseAdmin
      .from("topics")
      .insert(topicPayload)
      .select(TOPIC_SELECT_FIELDS)
      .single();

    if (error) {
      throw new ExternalServiceError("Unable to create topic", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: { title: data.title },
    });

    const [topicWithAuthor] = await attachAuthors([data]);
    return res.status(201).json({ topic: topicWithAuthor });
  } catch (error) {
    return next(error);
  }
};

const updateTopic = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const { topicId } = req.params;
    const payload = req.body || {};

    const existing = await topicService.getTopicById(topicId, { includeDeleted: true });

    if (payload.title !== undefined) {
      const trimmedTitle = String(payload.title || "").trim();
      if (!trimmedTitle) {
        throw new BadRequestError("Topic title cannot be empty.");
      }
      if (trimmedTitle.toLowerCase() !== String(existing.title || "").toLowerCase()) {
        const { data: dupes, error: dupesError } = await supabaseAdmin
          .from("topics")
          .select("id")
          .ilike("title", trimmedTitle)
          .is("deleted_at", null);
        if (dupesError) {
          throw new ExternalServiceError("Unable to validate topic title", {
            code: dupesError.code,
            details: dupesError.message,
          });
        }
        if (dupes && dupes.length > 0) {
          throw new ConflictError("A topic with that title already exists.");
        }
      }
    }

    const updates = {};
    if (payload.title !== undefined) updates.title = String(payload.title).trim();
    if (payload.description !== undefined) {
      updates.description = payload.description ? String(payload.description).trim() : null;
    }
    if (payload.link_url !== undefined) {
      updates.link_url = payload.link_url ? String(payload.link_url).trim() : null;
    }
    if (payload.time_allocated !== undefined) updates.time_allocated = payload.time_allocated;
    if (payload.time_unit !== undefined) updates.time_unit = payload.time_unit;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.certificate_file_url !== undefined) {
      updates.certificate_file_url = payload.certificate_file_url
        ? String(payload.certificate_file_url).trim()
        : null;
    }
    if (payload.start_date !== undefined) updates.start_date = payload.start_date ?? null;
    if (payload.end_date !== undefined) updates.end_date = payload.end_date ?? null;
    if (payload.author_id !== undefined) updates.author_id = payload.author_id ?? null;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError("No topic updates supplied.");
    }

    updates.edited = true;
    if (userId) updates.updated_by = userId;

    const { error } = await supabaseAdmin.from("topics").update(updates).eq("id", topicId);
    if (error) {
      throw new ExternalServiceError("Unable to update topic", {
        code: error.code,
        details: error.message,
      });
    }

    if (payload.status !== undefined && payload.status !== existing.status) {
      await auditLogService.recordAuditLog({
        entityType: "topic",
        entityId: topicId,
        action: "status_changed",
        actorId: userId,
        details: { from: existing.status, to: payload.status },
      });
    } else {
      await auditLogService.recordAuditLog({
        entityType: "topic",
        entityId: topicId,
        action: "updated",
        actorId: userId,
      });
    }

    return res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    return next(error);
  }
};

const deleteTopic = async (req, res, next) => {
  try {
    const userId = req.auth?.sub ?? null;
    const { topicId } = req.params;
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("topics")
      .update({
        status: "inactive",
        deleted_at: now,
        updated_by: userId ?? undefined,
      })
      .eq("id", topicId);
    if (error) {
      throw new ExternalServiceError("Unable to delete topic", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic",
      entityId: topicId,
      action: "soft_deleted",
      actorId: userId,
      details: { status: "inactive" },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  topicController: {
    listTopics,
    createTopic,
    updateTopic,
    deleteTopic,
  },
};

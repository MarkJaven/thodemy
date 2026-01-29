const { supabaseAdmin } = require("../config/supabase");
const { auditLogService } = require("../services/auditLogService");
const { topicService } = require("../services/topicService");
const { topicSubmissionService } = require("../services/topicSubmissionService");
const {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const logger = require("../utils/logger");

const SUBMISSION_SELECT_FIELDS =
  "id, topic_id, user_id, file_url, message, status, submitted_at, reviewed_by, reviewed_at, review_notes, created_at, updated_at";

const createTopicSubmission = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const userId = req.auth?.sub;
    const message = req.body?.message;

    if (!userId) {
      throw new BadRequestError("User id missing.");
    }

    await topicService.ensureTopicIsActive(topicId);
    topicSubmissionService.validateSubmissionFile(req.file);

    const storagePath = topicSubmissionService.buildSubmissionStoragePath(
      userId,
      topicId,
      req.file?.originalname
    );

    const upload = await supabaseAdmin.storage
      .from("topic-proofs")
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (upload.error) {
      throw new ExternalServiceError("Unable to upload proof file", {
        code: upload.error.statusCode || upload.error.code,
        details: upload.error.message,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("topic_submissions")
      .insert({
        topic_id: topicId,
        user_id: userId,
        file_url: storagePath,
        message: message ? String(message).trim() : null,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select(SUBMISSION_SELECT_FIELDS)
      .single();

    if (error) {
      const cleanup = await supabaseAdmin.storage.from("topic-proofs").remove([storagePath]);
      if (cleanup.error) {
        logger.warn("topic_submission_cleanup_failed", {
          topicId,
          userId,
          storagePath,
          error: cleanup.error.message,
        });
      }
      throw new ExternalServiceError("Unable to create topic submission", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "topic_submission",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: { topic_id: topicId, status: data.status },
    });

    return res.status(201).json({ submission: data });
  } catch (error) {
    return next(error);
  }
};

const listTopicSubmissions = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { status, user_id: userId, from, to } = req.query;

    let query = supabaseAdmin
      .from("topic_submissions")
      .select(SUBMISSION_SELECT_FIELDS)
      .eq("topic_id", topicId);

    if (status) {
      const statusList = String(status)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (statusList.length) {
        query = query.in("status", statusList);
      }
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (from) {
      query = query.gte("submitted_at", from);
    }

    if (to) {
      query = query.lte("submitted_at", to);
    }

    const { data, error } = await query.order("submitted_at", { ascending: false });
    if (error) {
      throw new ExternalServiceError("Unable to load submissions", {
        code: error.code,
        details: error.message,
      });
    }

    return res.json({ submissions: data ?? [] });
  } catch (error) {
    return next(error);
  }
};

const listSubmissions = async (req, res, next) => {
  try {
    const { status, user_id: userId, topic_id: topicId, from, to } = req.query;

    let query = supabaseAdmin.from("topic_submissions").select(SUBMISSION_SELECT_FIELDS);

    if (topicId) {
      query = query.eq("topic_id", topicId);
    }

    if (status) {
      const statusList = String(status)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (statusList.length) {
        query = query.in("status", statusList);
      }
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (from) {
      query = query.gte("submitted_at", from);
    }

    if (to) {
      query = query.lte("submitted_at", to);
    }

    const { data, error } = await query.order("submitted_at", { ascending: false });
    if (error) {
      throw new ExternalServiceError("Unable to load submissions", {
        code: error.code,
        details: error.message,
      });
    }

    return res.json({ submissions: data ?? [] });
  } catch (error) {
    return next(error);
  }
};

const getSubmissionFile = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("topic_submissions")
      .select("file_url")
      .eq("id", submissionId)
      .single();

    if (error || !data) {
      throw new NotFoundError("Submission not found.");
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("topic-proofs")
      .createSignedUrl(data.file_url, 300);

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

const updateSubmissionStatus = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, review_notes } = req.body || {};
    const reviewerId = req.auth?.sub ?? null;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("topic_submissions")
      .select("id, status, topic_id, user_id")
      .eq("id", submissionId)
      .maybeSingle();
    if (existingError) {
      throw new ExternalServiceError("Unable to load submission", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (!existing) {
      throw new NotFoundError("Submission not found.");
    }

    const now = new Date().toISOString();
    const updates = {
      status,
      review_notes: review_notes ? String(review_notes).trim() : null,
    };

    if (status !== "pending") {
      updates.reviewed_by = reviewerId;
      updates.reviewed_at = now;
    } else {
      updates.reviewed_by = null;
      updates.reviewed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from("topic_submissions")
      .update(updates)
      .eq("id", submissionId)
      .select(SUBMISSION_SELECT_FIELDS)
      .single();
    if (error) {
      throw new ExternalServiceError("Unable to update submission status", {
        code: error.code,
        details: error.message,
      });
    }

    if (status === "completed") {
      const progressPayload = {
        topic_id: existing.topic_id,
        user_id: existing.user_id,
        status: "completed",
        start_date: now,
        end_date: now,
      };
      const { error: progressError } = await supabaseAdmin
        .from("topic_progress")
        .upsert(progressPayload, { onConflict: "user_id,topic_id" });
      if (progressError) {
        throw new ExternalServiceError("Unable to sync topic progress", {
          code: progressError.code,
          details: progressError.message,
        });
      }
    }

    await auditLogService.recordAuditLog({
      entityType: "topic_submission",
      entityId: submissionId,
      action: "status_changed",
      actorId: reviewerId,
      details: {
        from: existing.status,
        to: status,
        review_notes: updates.review_notes,
      },
    });

    return res.json({ submission: data });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submissionController: {
    createTopicSubmission,
    listTopicSubmissions,
    listSubmissions,
    updateSubmissionStatus,
    getSubmissionFile,
  },
};

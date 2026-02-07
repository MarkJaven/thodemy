const { supabaseAdmin } = require("../config/supabase");
const { auditLogService } = require("../services/auditLogService");
const { activitySubmissionService } = require("../services/activitySubmissionService");
const {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const logger = require("../utils/logger");

const ACTIVITY_SUBMISSION_SELECT =
  "id, activity_id, user_id, course_id, title, description, github_url, status, score, reviewed_at, review_notes, file_name, file_type, storage_path, created_at, updated_at";

const createActivitySubmission = async (req, res, next) => {
  try {
    const userId = req.auth?.sub;
    const titleInput = req.body?.title;
    const descriptionInput = req.body?.description;
    const githubUrlInput = req.body?.github_url;
    const activityIdInput = req.body?.activity_id;

    if (!userId) {
      throw new BadRequestError("User id missing.");
    }

    if (!titleInput || !String(titleInput).trim()) {
      throw new BadRequestError("Title is required.");
    }

    const title = String(titleInput).trim();
    const description = descriptionInput ? String(descriptionInput).trim() : null;
    const githubUrl = githubUrlInput ? String(githubUrlInput).trim() : null;
    const activityId = activityIdInput ? String(activityIdInput).trim() : null;

    if (!req.file && !githubUrl && !description) {
      throw new BadRequestError("Provide a GitHub link, description, or file.");
    }

    activitySubmissionService.validateActivitySubmissionFile(req.file);

    let activityMeta = null;
    if (activityId) {
      const { data, error } = await supabaseAdmin
        .from("activities")
        .select("id, course_id")
        .eq("id", activityId)
        .maybeSingle();
      if (error) {
        throw new ExternalServiceError("Unable to load project assignment", {
          code: error.code,
          details: error.message,
        });
      }
      if (!data) {
        throw new NotFoundError("Project assignment not found.");
      }
      activityMeta = data;
    }

    let storagePath = null;
    let fileName = null;
    let fileType = null;
    if (req.file) {
      storagePath = activitySubmissionService.buildActivitySubmissionStoragePath(
        userId,
        req.file.originalname
      );
      const upload = await supabaseAdmin.storage
        .from("activity-submissions")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (upload.error) {
        throw new ExternalServiceError("Unable to upload project file", {
          code: upload.error.statusCode || upload.error.code,
          details: upload.error.message,
        });
      }
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    const { data, error } = await supabaseAdmin
      .from("activity_submissions")
      .insert({
        user_id: userId,
        activity_id: activityId,
        course_id: activityMeta?.course_id ?? null,
        title,
        description,
        github_url: githubUrl,
        status: "pending",
        file_name: fileName,
        file_type: fileType,
        storage_path: storagePath,
      })
      .select(ACTIVITY_SUBMISSION_SELECT)
      .single();

    if (error) {
      if (storagePath) {
        const cleanup = await supabaseAdmin.storage
          .from("activity-submissions")
          .remove([storagePath]);
        if (cleanup.error) {
          logger.warn("activity_submission_cleanup_failed", {
            userId,
            storagePath,
            error: cleanup.error.message,
          });
        }
      }
      throw new ExternalServiceError("Unable to create project submission", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "activity_submission",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: { title: data.title },
    });

    return res.status(201).json({ submission: data });
  } catch (error) {
    return next(error);
  }
};

const deleteActivitySubmission = async (req, res, next) => {
  try {
    const submissionId = req.params.activityId;
    const userId = req.auth?.sub;

    if (!userId) {
      throw new BadRequestError("User id missing.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("activity_submissions")
      .select("id, user_id, storage_path, title")
      .eq("id", submissionId)
      .maybeSingle();

    if (existingError) {
      throw new ExternalServiceError("Unable to load project submission", {
        code: existingError.code,
        details: existingError.message,
      });
    }

    if (!existing || existing.user_id !== userId) {
      throw new NotFoundError("Project submission not found.");
    }

    if (existing.storage_path) {
      const removal = await supabaseAdmin.storage
        .from("activity-submissions")
        .remove([existing.storage_path]);
      if (removal.error) {
        logger.warn("activity_submission_remove_failed", {
          submissionId,
          storagePath: existing.storage_path,
          error: removal.error.message,
        });
      }
    }

    const { error } = await supabaseAdmin
      .from("activity_submissions")
      .delete()
      .eq("id", submissionId);
    if (error) {
      throw new ExternalServiceError("Unable to delete project submission", {
        code: error.code,
        details: error.message,
      });
    }

    await auditLogService.recordAuditLog({
      entityType: "activity_submission",
      entityId: submissionId,
      action: "deleted",
      actorId: userId,
      details: { title: existing.title ?? null },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  activityController: {
    createActivitySubmission,
    deleteActivitySubmission,
  },
};

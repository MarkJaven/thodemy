const {
  ACTIVITY_SUBMISSION_ALLOWED_MIME_TYPES,
  ACTIVITY_SUBMISSION_MAX_FILE_SIZE_BYTES,
  ACTIVITY_SUBMISSION_MAX_FILE_SIZE_MB,
} = require("../constants/uploads");
const { BadRequestError } = require("../utils/errors");

/**
 * Validate an activity submission file.
 * @param {Express.Multer.File|undefined} file
 */
const validateActivitySubmissionFile = (file) => {
  if (!file) {
    return;
  }
  if (!ACTIVITY_SUBMISSION_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError("Project file must be a PDF, JPG, or PNG.");
  }
  if (file.size > ACTIVITY_SUBMISSION_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `Project file must be smaller than ${ACTIVITY_SUBMISSION_MAX_FILE_SIZE_MB}MB.`
    );
  }
};

/**
 * Build a safe storage path for an activity submission file.
 * @param {string} userId
 * @param {string} originalName
 * @returns {string}
 */
const buildActivitySubmissionStoragePath = (userId, originalName) => {
  const safeName = String(originalName || "project")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${safeName}`;
};

module.exports = {
  activitySubmissionService: {
    validateActivitySubmissionFile,
    buildActivitySubmissionStoragePath,
  },
};

const {
  TOPIC_SUBMISSION_ALLOWED_MIME_TYPES,
  TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES,
  TOPIC_SUBMISSION_MAX_FILE_SIZE_MB,
} = require("../constants/uploads");
const { BadRequestError } = require("../utils/errors");

/**
 * Validate a topic submission file.
 * @param {Express.Multer.File|undefined} file
 */
const validateSubmissionFile = (file) => {
  if (!file) {
    throw new BadRequestError("Proof file is required.");
  }
  if (!TOPIC_SUBMISSION_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError("Proof file must be a PDF, JPG, or PNG.");
  }
  if (file.size > TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `Proof file must be smaller than ${TOPIC_SUBMISSION_MAX_FILE_SIZE_MB}MB.`
    );
  }
};

/**
 * Build a safe storage path for a topic submission file.
 * @param {string} userId
 * @param {string} topicId
 * @param {string} originalName
 * @returns {string}
 */
const buildSubmissionStoragePath = (userId, topicId, originalName) => {
  const safeName = String(originalName || "proof")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${topicId}/${Date.now()}-${safeName}`;
};

module.exports = {
  topicSubmissionService: {
    validateSubmissionFile,
    buildSubmissionStoragePath,
  },
};

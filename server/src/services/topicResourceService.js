const {
  TOPIC_RESOURCE_ALLOWED_MIME_TYPES,
  TOPIC_RESOURCE_MAX_FILE_SIZE_BYTES,
  TOPIC_RESOURCE_MAX_FILE_SIZE_MB,
} = require("../constants/uploads");
const { BadRequestError } = require("../utils/errors");

const validateResourceFile = (file) => {
  if (!file) {
    throw new BadRequestError("Resource file is required.");
  }
  if (!TOPIC_RESOURCE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(
      "Resource file type is not supported. Use PDF, Office docs, images, or zip."
    );
  }
  if (file.size > TOPIC_RESOURCE_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `Resource file must be smaller than ${TOPIC_RESOURCE_MAX_FILE_SIZE_MB}MB.`
    );
  }
};

const buildResourceStoragePath = (topicId, originalName) => {
  const safeName = String(originalName || "resource")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${topicId}/${Date.now()}-${safeName}`;
};

module.exports = {
  topicResourceService: {
    validateResourceFile,
    buildResourceStoragePath,
  },
};

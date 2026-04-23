const TOPIC_SUBMISSION_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const TOPIC_SUBMISSION_MAX_FILE_SIZE_MB = 10;
const TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES =
  TOPIC_SUBMISSION_MAX_FILE_SIZE_MB * 1024 * 1024;

const TOPIC_RESOURCE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const TOPIC_RESOURCE_MAX_FILE_SIZE_MB = 15;
const TOPIC_RESOURCE_MAX_FILE_SIZE_BYTES =
  TOPIC_RESOURCE_MAX_FILE_SIZE_MB * 1024 * 1024;

module.exports = {
  TOPIC_SUBMISSION_ALLOWED_MIME_TYPES,
  TOPIC_SUBMISSION_MAX_FILE_SIZE_MB,
  TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES,
  ACTIVITY_SUBMISSION_ALLOWED_MIME_TYPES: TOPIC_SUBMISSION_ALLOWED_MIME_TYPES,
  ACTIVITY_SUBMISSION_MAX_FILE_SIZE_MB: TOPIC_SUBMISSION_MAX_FILE_SIZE_MB,
  ACTIVITY_SUBMISSION_MAX_FILE_SIZE_BYTES: TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES,
  TOPIC_RESOURCE_ALLOWED_MIME_TYPES,
  TOPIC_RESOURCE_MAX_FILE_SIZE_MB,
  TOPIC_RESOURCE_MAX_FILE_SIZE_BYTES,
};

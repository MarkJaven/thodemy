const multer = require("multer");
const { BadRequestError } = require("../utils/errors");
const { TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES } = require("../constants/uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TOPIC_SUBMISSION_MAX_FILE_SIZE_BYTES },
});

/**
 * Handle single file upload for topic submissions.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const uploadTopicSubmission = (req, _res, next) => {
  upload.single("file")(req, _res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("Proof file is too large."));
      }
      return next(new BadRequestError(err.message || "Unable to upload file."));
    }
    return next();
  });
};

/**
 * Handle single file upload for activity submissions.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const uploadActivitySubmission = (req, _res, next) => {
  upload.single("file")(req, _res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("Project file is too large."));
      }
      return next(new BadRequestError(err.message || "Unable to upload file."));
    }
    return next();
  });
};

module.exports = { uploadTopicSubmission, uploadActivitySubmission };

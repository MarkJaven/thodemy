const { body } = require("express-validator");

/**
 * Ensure a request has no body payload.
 * @param {any} _value
 * @param {{req: import("express").Request}} context
 * @returns {boolean}
 */
const noBodyAllowed = body().custom((_value, { req }) => {
  if (req.body && Object.keys(req.body).length > 0) {
    throw new Error("Request body is not allowed for this endpoint.");
  }
  return true;
});

const validateNoBody = [noBodyAllowed];
const validateMe = [noBodyAllowed];

module.exports = { validateMe, validateNoBody };

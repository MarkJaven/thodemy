/**
 * Base application error with HTTP metadata.
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an AppError instance.
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {object|null} details
   */
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.code = code || "INTERNAL_ERROR";
    this.details = details || null;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error with field details.
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * Create a ValidationError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Validation failed", 400, "VALIDATION_ERROR", details);
  }
}

/**
 * Authentication error for missing or invalid credentials.
 * @extends AppError
 */
class AuthError extends AppError {
  /**
   * Create an AuthError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Unauthorized", 401, "AUTH_ERROR", details);
  }
}

/**
 * Authorization error for forbidden access.
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * Create a ForbiddenError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Forbidden", 403, "FORBIDDEN", details);
  }
}

/**
 * Resource not found error.
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * Create a NotFoundError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Resource not found", 404, "NOT_FOUND", details);
  }
}

/**
 * Rate limit exceeded error.
 * @extends AppError
 */
class RateLimitError extends AppError {
  /**
   * Create a RateLimitError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Too many requests", 429, "RATE_LIMIT", details);
  }
}

/**
 * Database operation error.
 * @extends AppError
 */
class DatabaseError extends AppError {
  /**
   * Create a DatabaseError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Database operation failed", 500, "DATABASE_ERROR", details);
  }
}

/**
 * Upstream dependency error.
 * @extends AppError
 */
class ExternalServiceError extends AppError {
  /**
   * Create an ExternalServiceError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "External service error", 502, "EXTERNAL_SERVICE_ERROR", details);
  }
}

/**
 * Conflict error for duplicate or conflicting resources.
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * Create a ConflictError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Conflict", 409, "CONFLICT", details);
  }
}

/**
 * Bad request error for malformed input.
 * @extends AppError
 */
class BadRequestError extends AppError {
  /**
   * Create a BadRequestError.
   * @param {string} message
   * @param {object|Array|null} details
   */
  constructor(message, details) {
    super(message || "Bad request", 400, "BAD_REQUEST", details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ConflictError,
  BadRequestError,
};

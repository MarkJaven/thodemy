const { supabaseAdmin } = require("../config/supabase");
const { BadRequestError, ExternalServiceError, NotFoundError } = require("../utils/errors");

/**
 * Fetch a topic by id.
 * @param {string} topicId
 * @param {{includeDeleted?: boolean}} options
 * @returns {Promise<object>}
 */
const getTopicById = async (topicId, options = {}) => {
  const { includeDeleted = false } = options;
  let query = supabaseAdmin
    .from("topics")
    .select(
      "id, title, status, deleted_at, certificate_file_url, start_date, end_date, author_id, edited"
    )
    .eq("id", topicId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new ExternalServiceError("Unable to load topic", {
      code: error.code,
      details: error.message,
    });
  }
  if (!data) {
    throw new NotFoundError("Topic not found.");
  }
  return data;
};

/**
 * Ensure a topic is active for user submissions.
 * @param {string} topicId
 * @returns {Promise<void>}
 */
const ensureTopicIsActive = async (topicId) => {
  const topic = await getTopicById(topicId, { includeDeleted: false });
  if (topic.status !== "active") {
    throw new BadRequestError("Topic is inactive.");
  }
};

module.exports = { topicService: { getTopicById, ensureTopicIsActive } };

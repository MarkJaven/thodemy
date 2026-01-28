const { supabaseAdmin } = require("../config/supabase");
const { DatabaseError } = require("../utils/errors");

/**
 * Fetch a profile row by user id.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
const getProfileByUserId = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new DatabaseError("Unable to load profile", {
        code: error.code,
        details: error.message,
      });
    }

    return data || null;
  } catch (error) {
    throw error;
  }
};

module.exports = { supabaseService: { getProfileByUserId } };

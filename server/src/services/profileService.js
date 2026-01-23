const { supabaseService } = require("./supabaseService");

/**
 * Load a profile for the supplied auth payload.
 * @param {{sub?: string}|null|undefined} authPayload
 * @returns {Promise<object|null>}
 */
const getProfileForUser = async (authPayload) => {
  try {
    if (!authPayload || !authPayload.sub) {
      return null;
    }
    return await supabaseService.getProfileByUserId(authPayload.sub);
  } catch (error) {
    throw error;
  }
};

module.exports = { profileService: { getProfileForUser } };

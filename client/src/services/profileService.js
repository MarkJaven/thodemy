import { apiClient, getApiErrorMessage } from "../lib/apiClient";

/**
 * Fetch the authenticated user profile from the backend.
 * @returns {Promise<{user: object, profile: object|null}>}
 */
const getMe = async () => {
  try {
    const response = await apiClient.get("/me");
    return response.data?.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
};

export const profileService = { getMe };

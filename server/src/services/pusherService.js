const Pusher = require("pusher");
const { env } = require("../config/env");
const { ExternalServiceError } = require("../utils/errors");

let client = null;

const getClient = () => {
  if (client) return client;
  if (!env.pusherAppId || !env.pusherKey || !env.pusherSecret || !env.pusherCluster) {
    return null;
  }
  client = new Pusher({
    appId: env.pusherAppId,
    key: env.pusherKey,
    secret: env.pusherSecret,
    cluster: env.pusherCluster,
    useTLS: true,
  });
  return client;
};

/**
 * Publish a force logout event for a user.
 * @param {string} userId
 * @param {string} deviceId
 * @param {string} deviceInfo
 * @returns {Promise<void>}
 */
const sendForceLogout = async (userId, deviceId, deviceInfo) => {
  const pusher = getClient();
  if (!pusher) {
    throw new ExternalServiceError("Pusher is not configured");
  }
  try {
    await pusher.trigger(`user-${userId}`, "force_logout", {
      deviceId,
      deviceInfo,
      ts: Date.now(),
    });
  } catch (error) {
    throw new ExternalServiceError("Failed to send realtime logout", {
      details: error?.message,
    });
  }
};

module.exports = { pusherService: { sendForceLogout } };

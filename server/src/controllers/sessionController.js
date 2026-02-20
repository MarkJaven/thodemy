const { supabaseAdmin } = require("../config/supabase");
const { pusherService } = require("../services/pusherService");
const { BadRequestError, ExternalServiceError, NotFoundError } = require("../utils/errors");
const { sendSuccess } = require("../utils/responses");

const DEVICE_APPROVAL_TTL_MS = 10 * 60 * 1000;

/**
 * Announce a new active session and force logout other devices.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const announceSession = async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId;
    const deviceInfo = req.body?.deviceInfo || "Unknown device";
    if (!deviceId) {
      throw new BadRequestError("deviceId is required");
    }
    await pusherService.sendForceLogout(req.auth.sub, deviceId, deviceInfo);
    return sendSuccess(res, { message: "force logout broadcasted" });
  } catch (error) {
    return next(error);
  }
};

/**
 * Deactivate the current device session for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const deactivateCurrentSession = async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId;
    if (!deviceId) {
      throw new BadRequestError("deviceId is required");
    }

    const { error } = await supabaseAdmin
      .from("user_sessions")
      .update({
        is_active: false,
        last_activity_at: new Date().toISOString(),
      })
      .eq("user_id", req.auth.sub)
      .eq("session_token", deviceId);

    if (error) {
      throw new ExternalServiceError("Unable to deactivate current session", {
        details: error.message,
      });
    }

    return sendSuccess(res, { data: { status: "deactivated" } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Deactivate all sessions for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const deactivateAllSessions = async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("user_sessions")
      .update({
        is_active: false,
        last_activity_at: new Date().toISOString(),
      })
      .eq("user_id", req.auth.sub);

    if (error) {
      throw new ExternalServiceError("Unable to deactivate sessions", {
        details: error.message,
      });
    }

    return sendSuccess(res, { data: { status: "deactivated" } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Request approval for a new device login.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const requestDeviceApproval = async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId;
    const deviceInfo = req.body?.deviceInfo || "Unknown device";
    if (!deviceId) {
      throw new BadRequestError("deviceId is required");
    }

    const userId = req.auth.sub;
    const { data: activeSession, error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .select("session_token, device_info, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) {
      throw new ExternalServiceError("Unable to verify current session", {
        details: sessionError.message,
      });
    }

    if (!activeSession || activeSession.is_active === false || activeSession.session_token === deviceId) {
      return sendSuccess(res, {
        data: { status: "approved", requestId: null },
      });
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("device_login_requests")
      .insert({
        user_id: userId,
        device_token: deviceId,
        device_info: deviceInfo,
        user_agent: req.get("user-agent") || null,
        status: "pending",
      })
      .select("id, requested_at")
      .single();

    if (requestError) {
      throw new ExternalServiceError("Unable to create device approval request", {
        details: requestError.message,
      });
    }

    try {
      await pusherService.sendDeviceLoginRequest(userId, {
        requestId: request.id,
        deviceId,
        deviceInfo,
        requestedAt: request.requested_at,
      });
    } catch (error) {
      // Ignore realtime failures; polling will still surface the request.
    }

    return sendSuccess(res, {
      data: {
        status: "pending",
        requestId: request.id,
        requestedAt: request.requested_at,
        existingDevice: activeSession.device_info || "Another device",
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Resolve a device login request.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const resolveDeviceApproval = async (req, res, next) => {
  try {
    const requestId = req.body?.requestId;
    const action = req.body?.action;
    if (!requestId) {
      throw new BadRequestError("requestId is required");
    }
    if (!["approve", "deny"].includes(action)) {
      throw new BadRequestError("action must be approve or deny");
    }

    const userId = req.auth.sub;
    const { data: request, error: requestError } = await supabaseAdmin
      .from("device_login_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new ExternalServiceError("Unable to load device approval request", {
        details: requestError.message,
      });
    }
    if (!request || request.user_id !== userId) {
      throw new NotFoundError("Device approval request not found");
    }
    if (request.status !== "pending") {
      return sendSuccess(res, { data: { status: request.status } });
    }

    const nextStatus = action === "approve" ? "approved" : "denied";
    const resolvedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("device_login_requests")
      .update({ status: nextStatus, resolved_at: resolvedAt, resolved_by: userId })
      .eq("id", requestId)
      .select("id, status, resolved_at")
      .single();

    if (updateError) {
      throw new ExternalServiceError("Unable to resolve device approval request", {
        details: updateError.message,
      });
    }

    try {
      await pusherService.sendDeviceLoginResolution(userId, {
        requestId,
        status: updated.status,
      });
    } catch (error) {
      // Ignore realtime failures; polling will still surface the update.
    }

    return sendSuccess(res, { data: { status: updated.status, resolvedAt: updated.resolved_at } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get approval status for a request.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const getDeviceApprovalStatus = async (req, res, next) => {
  try {
    const requestId = req.params.requestId;
    if (!requestId) {
      throw new BadRequestError("requestId is required");
    }
    const userId = req.auth.sub;
    const { data: request, error: requestError } = await supabaseAdmin
      .from("device_login_requests")
      .select("id, user_id, status, requested_at, resolved_at")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      throw new ExternalServiceError("Unable to load device approval status", {
        details: requestError.message,
      });
    }
    if (!request || request.user_id !== userId) {
      throw new NotFoundError("Device approval request not found");
    }

    if (request.status === "pending") {
      const requestedAt = new Date(request.requested_at).getTime();
      if (Number.isFinite(requestedAt) && Date.now() - requestedAt > DEVICE_APPROVAL_TTL_MS) {
        const { data: updated } = await supabaseAdmin
          .from("device_login_requests")
          .update({ status: "expired", resolved_at: new Date().toISOString() })
          .eq("id", requestId)
          .select("id, status, resolved_at")
          .single();
        return sendSuccess(res, {
          data: { status: updated?.status || "expired", resolvedAt: updated?.resolved_at || null },
        });
      }
    }

    return sendSuccess(res, {
      data: { status: request.status, resolvedAt: request.resolved_at || null },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetch the most recent pending approval for the user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const getPendingDeviceApproval = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const { data: request, error: requestError } = await supabaseAdmin
      .from("device_login_requests")
      .select("id, device_token, device_info, requested_at, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      throw new ExternalServiceError("Unable to load device approval request", {
        details: requestError.message,
      });
    }

    if (!request) {
      return sendSuccess(res, { data: { request: null } });
    }

    const requestedAt = new Date(request.requested_at).getTime();
    if (Number.isFinite(requestedAt) && Date.now() - requestedAt > DEVICE_APPROVAL_TTL_MS) {
      await supabaseAdmin
        .from("device_login_requests")
        .update({ status: "expired", resolved_at: new Date().toISOString() })
        .eq("id", request.id);
      return sendSuccess(res, { data: { request: null } });
    }

    return sendSuccess(res, {
      data: {
        request: {
          requestId: request.id,
          deviceId: request.device_token,
          deviceInfo: request.device_info,
          requestedAt: request.requested_at,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  announceSession,
  deactivateCurrentSession,
  deactivateAllSessions,
  requestDeviceApproval,
  resolveDeviceApproval,
  getDeviceApprovalStatus,
  getPendingDeviceApproval,
};

const { adminUserService } = require("../services/adminUserService");
const { auditLogService } = require("../services/auditLogService");
const { adminReportService } = require("../services/adminReportService");

/**
 * Create a new user (superadmin only).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const createUser = async (req, res, next) => {
  try {
    const { email, username, password, role } = req.body;
    const result = await adminUserService.createUser({
      email,
      username,
      password,
      role,
      createdBy: req.auth?.sub,
    });
    await auditLogService.recordAuditLog({
      entityType: "user",
      entityId: result.id,
      action: "created",
      actorId: req.auth?.sub ?? null,
      details: { email, username, role },
    });
    res.status(201).json({ id: result.id });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (superadmin only).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const deleteUser = async (req, res, next) => {
  try {
    await adminUserService.deleteUser(req.params.userId);
    await auditLogService.recordAuditLog({
      entityType: "user",
      entityId: req.params.userId,
      action: "deactivated",
      actorId: req.auth?.sub ?? null,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Update user account details (superadmin only).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const updateUser = async (req, res, next) => {
  try {
    const { username, password, role, is_active } = req.body;
    await adminUserService.updateUser({
      userId: req.params.userId,
      username,
      password,
      role,
      is_active,
      updatedBy: req.auth?.sub,
    });
    await auditLogService.recordAuditLog({
      entityType: "user",
      entityId: req.params.userId,
      action: "updated",
      actorId: req.auth?.sub ?? null,
      details: {
        username: username ?? null,
        role: role ?? null,
        is_active: typeof is_active === "boolean" ? is_active : null,
        password_reset: Boolean(password),
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * List users (admin sees users only, superadmin sees all).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const listUsers = async (req, res, next) => {
  try {
    const roleFilter = req.userRole === "admin" ? "user" : undefined;
    const users = await adminUserService.listUsers({ roleFilter });
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * Download user checklist report as CSV.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const downloadUserChecklistReport = async (req, res, next) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const { csv, fileName } = await adminReportService.buildUserChecklistCsv({ userId });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Download user checklist report as Excel.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const downloadUserChecklistReportXlsx = async (req, res, next) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const { buffer, fileName } = await adminReportService.buildUserChecklistWorkbook({
      userId,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminController: {
    createUser,
    updateUser,
    deleteUser,
    listUsers,
    downloadUserChecklistReport,
    downloadUserChecklistReportXlsx,
  },
};

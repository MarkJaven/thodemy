const { adminUserService } = require("../services/adminUserService");

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
    const { username, password, role } = req.body;
    await adminUserService.updateUser({
      userId: req.params.userId,
      username,
      password,
      role,
      updatedBy: req.auth?.sub,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { adminController: { createUser, updateUser, deleteUser } };

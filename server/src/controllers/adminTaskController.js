const { adminTaskService } = require("../services/adminTaskService");

/**
 * List admin tasks (optionally filtered by status).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const listTasks = async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const tasks = await adminTaskService.listTasks({ status });
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new admin task.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    const task = await adminTaskService.createTask({
      title,
      description,
      priority,
      createdBy: req.auth?.sub ?? null,
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an admin task.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    const task = await adminTaskService.updateTask({
      taskId: req.params.taskId,
      updates: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
      },
    });
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a task as completed.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const completeTask = async (req, res, next) => {
  try {
    const task = await adminTaskService.completeTask({ taskId: req.params.taskId });
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * Reopen a completed task.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const reopenTask = async (req, res, next) => {
  try {
    const task = await adminTaskService.reopenTask({ taskId: req.params.taskId });
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const deleteTask = async (req, res, next) => {
  try {
    await adminTaskService.deleteTask({ taskId: req.params.taskId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminTaskController: {
    listTasks,
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
  },
};

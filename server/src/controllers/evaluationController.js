const { evaluationService } = require("../services/evaluationService");
const { profileService } = require("../services/profileService");

const listEvaluations = async (req, res, next) => {
  try {
    const { userId, status } = req.query;
    const evaluations = await evaluationService.listEvaluations({ userId, status });
    res.json(evaluations);
  } catch (error) {
    next(error);
  }
};

const getEvaluation = async (req, res, next) => {
  try {
    const evaluation = await evaluationService.getEvaluation(req.params.evaluationId);
    res.json(evaluation);
  } catch (error) {
    next(error);
  }
};

const createEvaluation = async (req, res, next) => {
  try {
    const { userId, learningPathId, traineeInfo, periodStart, periodEnd } = req.body;
    const result = await evaluationService.createEvaluation({
      userId,
      learningPathId,
      evaluatorId: req.auth?.sub,
      traineeInfo,
      periodStart,
      periodEnd,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateEvaluation = async (req, res, next) => {
  try {
    const result = await evaluationService.updateEvaluation(
      req.params.evaluationId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteEvaluation = async (req, res, next) => {
  try {
    await evaluationService.deleteEvaluation(req.params.evaluationId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const upsertScores = async (req, res, next) => {
  try {
    const { scores } = req.body;
    const result = await evaluationService.upsertScores(
      req.params.evaluationId,
      scores || []
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteScore = async (req, res, next) => {
  try {
    const { evaluationId, sheet, criterionKey } = req.params;
    const result = await evaluationService.deleteScore(evaluationId, {
      sheet,
      criterionKey: decodeURIComponent(criterionKey),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const autoPopulate = async (req, res, next) => {
  try {
    const result = await evaluationService.autoPopulateScores(req.params.evaluationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const downloadEvaluationXlsx = async (req, res, next) => {
  try {
    const { buildEvaluationWorkbook } = require("../services/evaluationExportService");
    const exporterProfile = await profileService.getProfileForUser(req.auth);
    const exportedByName =
      [exporterProfile?.first_name, exporterProfile?.last_name]
        .filter(Boolean)
        .join(" ") ||
      exporterProfile?.username ||
      exporterProfile?.email ||
      "";
    const { buffer, fileName } = await buildEvaluationWorkbook(
      req.params.evaluationId,
      { exportedByName }
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluationController: {
    listEvaluations,
    getEvaluation,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    upsertScores,
    deleteScore,
    autoPopulate,
    downloadEvaluationXlsx,
  },
};

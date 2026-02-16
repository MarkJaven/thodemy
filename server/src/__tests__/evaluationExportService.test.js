const ExcelJS = require("exceljs");

jest.mock("../services/evaluationService", () => ({
  evaluationService: {
    getEvaluation: jest.fn(),
  },
}));

const { evaluationService } = require("../services/evaluationService");
const { buildEvaluationWorkbook } = require("../services/evaluationExportService");

describe("evaluationExportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("preserves formulas, propagates feedback, clears summary placeholders, and applies template-aligned performance weights", async () => {
    evaluationService.getEvaluation.mockResolvedValue({
      id: "eval-1",
      user_id: "user-1",
      trainee_name: "Juan Dela Cruz",
      trainee_info: {
        department: "engineering",
        position: "trainee",
        trainer: "coach one",
        nickname: "juandelacruz",
        date_hired: "2025-01-01",
        endorsed_department: "engineering",
        date_endorsed: "2025-06-01",
      },
      period_start: "2025-01-01",
      period_end: "2025-06-30",
      updated_at: "2026-02-16T00:00:00.000Z",
      scores: [
        {
          sheet: "performance",
          category: "D",
          criterion_key: "pe_d",
          criterion_label: "Category D - Customer Satisfaction",
          score: 5,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "bootcamp_endorsement_feedback",
          criterion_key: "cat_A_strength",
          score: null,
          max_score: 5,
          remarks: "Strong ownership",
        },
        {
          sheet: "bootcamp_endorsement_feedback",
          criterion_key: "cat_A_improvement",
          score: null,
          max_score: 5,
          remarks: "Sharpen communication",
        },
        {
          sheet: "bootcamp_endorsement_feedback",
          criterion_key: "cat_D_strength",
          score: null,
          max_score: 5,
          remarks: "Responsive to clients",
        },
        {
          sheet: "bootcamp_endorsement_feedback",
          criterion_key: "cat_D_improvement",
          score: null,
          max_score: 5,
          remarks: "Improve SLA turnaround",
        },
        {
          sheet: "quiz_grades",
          criterion_key: "quiz_alpha",
          criterion_label: "Quiz Alpha",
          score: 8,
          max_score: 10,
          remarks: null,
        },
        {
          sheet: "scoreboard",
          category: "__activity_meta",
          criterion_key: "quiz_alpha",
          criterion_label: "Test Quiz",
          score: 4,
          max_score: 5,
          remarks: null,
          source: "auto_quiz",
        },
        {
          sheet: "scoreboard",
          category: "__activity_meta",
          criterion_key: "activity_portfolio",
          criterion_label: "Portfolio Project",
          score: null,
          max_score: 5,
          remarks: null,
          source: "manual",
        },
        {
          sheet: "scoreboard",
          category: "__activity_meta",
          criterion_key: "activity_legacy",
          criterion_label: "Legacy Activity",
          score: 5,
          max_score: 5,
          remarks: null,
          source: "auto_activity",
        },
        {
          sheet: "scoreboard",
          category: "__activity_meta",
          criterion_key: "activity_thodemy",
          criterion_label: "Thodemy",
          score: 5,
          max_score: 5,
          remarks: null,
          source: "manual",
        },
        {
          sheet: "scoreboard",
          category: "a1_teamwork",
          criterion_key: "activity_portfolio::a1_teamwork",
          criterion_label: "Portfolio Project",
          score: 18,
          max_score: 20,
          remarks: null,
          source: "manual",
        },
        {
          sheet: "behavioral",
          criterion_key: "bh_interpersonal_relations",
          criterion_label: "Interpersonal Relations",
          score: 4,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "behavioral",
          criterion_key: "bh_handling_situations",
          criterion_label: "Handling Situations",
          score: 2,
          max_score: 5,
          remarks: null,
        },
      ],
    });

    const { buffer } = await buildEvaluationWorkbook("eval-1");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const dashboard = workbook.getWorksheet("Dashboard");
    const performance = workbook.getWorksheet("Performance Evaluation");
    const part1 = workbook.getWorksheet("Part 1 Evaluation");
    const endorsement = workbook.getWorksheet("BootcampEndorsementScoreCard");
    const scorecard = workbook.getWorksheet("BootCampScoreCard");
    const scoreBoard = workbook.getWorksheet("ScoreBoard");
    const behavioralSheet = workbook.getWorksheet("Behavioral Evaluation");
    const summary = workbook.getWorksheet("Performance Summary");

    // Header placement check: values should stay in yellow D:F cells, not overwrite green labels B:C.
    expect(String(scorecard.getCell("B3").value || "")).toContain("Employee Name");
    expect(scorecard.getCell("D3").value).toBe("JUAN DELA CRUZ");
    expect(behavioralSheet.getCell("B6").value).toBe("JUAN DELA CRUZ");
    expect(behavioralSheet.getCell("B7").value).toBe("TRAINEE");
    expect(behavioralSheet.getCell("B8").value).toBeNull();

    // Formula preservation checks.
    expect(dashboard.getCell("F14").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(performance.getCell("E12").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(part1.getCell("E12").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(scorecard.getCell("N36").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(scorecard.getCell("N36").value.result).toBeCloseTo(4.5, 4);
    expect(scorecard.getCell("G4").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(scorecard.getCell("G4").value.result).toBeCloseTo(
      scorecard.getCell("O13").value.result,
      4
    );
    expect(scorecard.getCell("D47").value).toBe("☐");
    expect(scorecard.getCell("F47").value).toBe("☑");
    expect(scorecard.getCell("N15").value).toBeCloseTo(4.5, 4);
    expect(scorecard.getCell("N21").value).toBe(0);
    expect(behavioralSheet.getCell("B13").value).toBeNull();
    expect(behavioralSheet.getCell("B23").value).toBe(4);
    expect(behavioralSheet.getCell("B28").value).toBe(2);
    expect(behavioralSheet.getCell("C23").value).toBeNull();
    expect(behavioralSheet.getCell("D23").value).toBeNull();
    expect(behavioralSheet.getCell("C13").value).toBeNull();
    expect(behavioralSheet.getCell("D13").value).toBeNull();
    expect(behavioralSheet.getCell("E23").value).toEqual(
      expect.objectContaining({ result: 4 })
    );
    expect(behavioralSheet.getCell("E28").value).toEqual(
      expect.objectContaining({ result: 2 })
    );
    expect(behavioralSheet.getCell("B29").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: 6 })
    );
    expect(behavioralSheet.getCell("E29").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: 6 })
    );
    expect(behavioralSheet.getCell("E30").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(behavioralSheet.getCell("E30").value.result).toBeCloseTo(0.4, 4);

    // Feedback propagation checks.
    expect(endorsement.getCell("F12").value).toBe("Strong ownership");
    expect(endorsement.getCell("H12").value).toBe("Sharpen communication");
    expect(performance.getCell("F12").value).toBe("Strong ownership");
    expect(performance.getCell("H12").value).toBe("Sharpen communication");
    expect(part1.getCell("F12").value).toBe("Strong ownership");
    expect(part1.getCell("H12").value).toBe("Sharpen communication");

    // Weight correctness check (Category D contribution now 0.15).
    expect(performance.getCell("E15").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(performance.getCell("E15").value.result).toBeCloseTo(0.15, 4);

    // Laboratory Activities (left matrix) should not include quiz entries.
    const leftLabels = [];
    for (let row = 4; row <= 20; row += 1) {
      leftLabels.push(scoreBoard.getCell(`C${row}`).value);
    }
    expect(leftLabels).toContain("Legacy Activity");
    expect(leftLabels).toContain("Portfolio Project");
    expect(leftLabels).toContain("Thodemy");
    expect(leftLabels).not.toContain("Test Quiz");

    // Quiz appears only in right-side assessment list.
    expect(scoreBoard.getCell("AO4").value).toBe("Test Quiz");

    // Activity with legacy/base score should keep 5.0 fallback (not forced to 0).
    const legacyRow = leftLabels.findIndex((value) => value === "Legacy Activity") + 4;
    expect(legacyRow).toBeGreaterThanOrEqual(4);
    expect(scoreBoard.getCell(`E${legacyRow}`).value).toBe(scoreBoard.getCell("E1").value);
    expect(scoreBoard.getCell(`G${legacyRow}`).value).toBe(scoreBoard.getCell("G1").value);

    // Manual/ungraded activity should export missing criteria as explicit 0s
    // even if it has a base score value.
    const thodemyRow = leftLabels.findIndex((value) => value === "Thodemy") + 4;
    expect(thodemyRow).toBeGreaterThanOrEqual(4);
    expect(scoreBoard.getCell(`E${thodemyRow}`).value).toBe(0);
    expect(scoreBoard.getCell(`G${thodemyRow}`).value).toBe(0);
    expect(scoreBoard.getCell(`AI${thodemyRow}`).value).toBe(0);
    expect(scoreBoard.getCell(`AK${thodemyRow}`).value).toBe(0);

    // Summary cleanup checks.
    expect(summary.getCell("F13").value).toBeNull();
    expect(summary.getCell("I13").value).toBeNull();
    expect(summary.getCell("K13").value).toBeNull();
    expect(summary.getCell("J4").value).toBe("Consistently failed to expectations.");
  });

  it("sets quiz equivalent to 0 when quiz score is 0", async () => {
    evaluationService.getEvaluation.mockResolvedValue({
      id: "eval-2",
      user_id: "user-2",
      trainee_name: "No Submit",
      trainee_info: {
        department: "engineering",
        position: "trainee",
        trainer: "coach one",
        nickname: "nosubmit",
        date_hired: "2025-01-01",
      },
      period_start: "2025-01-01",
      period_end: "2025-06-30",
      updated_at: "2026-02-16T00:00:00.000Z",
      scores: [
        {
          sheet: "behavioral",
          criterion_key: "bh_adaptability",
          criterion_label: "Adaptability",
          score: 5,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "quiz_grades",
          criterion_key: "quiz_missed",
          criterion_label: "Missed Quiz",
          score: 0,
          max_score: 50,
          remarks: null,
        },
        {
          sheet: "scoreboard",
          category: "__activity_meta",
          criterion_key: "quiz_missed",
          criterion_label: "Missed Quiz",
          score: 0,
          max_score: 5,
          remarks: null,
          source: "auto_quiz",
        },
      ],
    });

    const { buffer } = await buildEvaluationWorkbook("eval-2");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const scoreBoard = workbook.getWorksheet("ScoreBoard");
    const scorecard = workbook.getWorksheet("BootCampScoreCard");
    const behavioralSheet = workbook.getWorksheet("Behavioral Evaluation");

    expect(scoreBoard.getCell("AO4").value).toBe("Missed Quiz");
    expect(scoreBoard.getCell("AQ4").value).toBe(0);
    expect(scoreBoard.getCell("AS4").value).toBe(50);

    const ar4 = scoreBoard.getCell("AR4").value;
    expect(ar4).toEqual(expect.objectContaining({ formula: expect.any(String) }));
    expect(ar4.formula).toContain("AQ4<=0");

    const ap4 = scoreBoard.getCell("AP4").value;
    expect(ap4).toEqual(expect.objectContaining({ formula: expect.any(String) }));
    expect(ap4.formula).toContain("AR4<=0, 0");

    expect(scorecard.getCell("N36").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(behavioralSheet.getCell("B13").value).toBe(5);
    expect(behavioralSheet.getCell("C13").value).toBeNull();
    expect(behavioralSheet.getCell("D13").value).toBeNull();
    expect(behavioralSheet.getCell("E13").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: 5 })
    );
    expect(behavioralSheet.getCell("B29").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: 5 })
    );
    expect(behavioralSheet.getCell("E29").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: 5 })
    );
    expect(behavioralSheet.getCell("E30").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(behavioralSheet.getCell("E30").value.result).toBeCloseTo(0.3333, 4);
    expect(scorecard.getCell("D47").value).toBe("☐");
    expect(scorecard.getCell("F47").value).toBe("☐");
  });
});

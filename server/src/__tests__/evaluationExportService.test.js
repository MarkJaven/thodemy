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
          // Manual performance scores should be ignored (auto-derived ngayon).
          sheet: "performance",
          category: "D",
          criterion_key: "pe_d",
          criterion_label: "Category D - Customer Satisfaction",
          score: 0,
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
          sheet: "performance_feedback",
          criterion_key: "cat_A_strength",
          score: null,
          max_score: 5,
          remarks: "Performance strength A",
        },
        {
          sheet: "performance_feedback",
          criterion_key: "cat_A_improvement",
          score: null,
          max_score: 5,
          remarks: "Performance improvement A",
        },
        {
          sheet: "performance_feedback",
          criterion_key: "cat_D_strength",
          score: null,
          max_score: 5,
          remarks: "Performance strength D",
        },
        {
          sheet: "performance_feedback",
          criterion_key: "cat_D_improvement",
          score: null,
          max_score: 5,
          remarks: "Performance improvement D",
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
          sheet: "scoreboard",
          category: "d1_responsiveness",
          criterion_key: "activity_portfolio::d1_responsiveness",
          criterion_label: "Portfolio Project",
          score: 50,
          max_score: 50,
          remarks: null,
          source: "manual",
        },
        {
          sheet: "technical",
          criterion_key: "te_technical_knowledge",
          criterion_label: "Tasks completed as stated in the WAS",
          score: 4,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "sheet2_rating",
          category: "technical_business_analyst",
          criterion_key: "sheet2_technical_business_analyst_technical_skills",
          criterion_label: "Technical Business Analyst - Technical Skills",
          score: 5,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "sheet2_rating",
          category: "technical_business_analyst",
          criterion_key: "sheet2_technical_business_analyst_problem_solving",
          criterion_label: "Technical Business Analyst - Problem-Solving",
          score: 2,
          max_score: 5,
          remarks: null,
        },
        {
          sheet: "sheet2_rating",
          category: "technical_business_analyst",
          criterion_key: "sheet2_technical_business_analyst_communication",
          criterion_label: "Technical Business Analyst - Communication",
          score: 3,
          max_score: 5,
          remarks: null,
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
    const technicalSheet = workbook.getWorksheet("Technical Evaluation");
    const sheet2 = workbook.getWorksheet("Sheet2");
    const regularization = workbook.getWorksheet("Regularization Endorsement");
    const summary = workbook.getWorksheet("Performance Summary");
    const checklist = workbook.getWorksheet("Checklist");

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
    // Dashboard feedback now sources from performance_feedback (not bootcamp endorsement).
    expect(dashboard.getCell("G14").value).toBe("Performance strength A");
    expect(dashboard.getCell("L14").value).toBe("Performance improvement A");
    expect(dashboard.getCell("G15").value).toBeNull();
    expect(dashboard.getCell("L15").value).toBeNull();
    expect(dashboard.getCell("G17").value).toBe("Performance strength D");
    expect(dashboard.getCell("L17").value).toBe("Performance improvement D");
    // Dashboard performance rows (26-32) should show endorsement feedback.
    expect(dashboard.getCell("G26").value).toBe("Strong ownership");
    expect(dashboard.getCell("L26").value).toBe("Sharpen communication");
    expect(dashboard.getCell("G27").value).toBeNull();
    expect(dashboard.getCell("L27").value).toBeNull();
    expect(dashboard.getCell("G29").value).toBe("Responsive to clients");
    expect(dashboard.getCell("L29").value).toBe("Improve SLA turnaround");
    expect(performance.getCell("E12").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(part1.getCell("E12").value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(part1.getCell("E12").value.formula).toContain("'Technical Evaluation'!I18");
    const part1E12Result = part1.getCell("E12").value.result;
    const technicalI18Result = technicalSheet.getCell("I18").value.result;
    expect(part1E12Result).toBeCloseTo(technicalI18Result || 0, 4);
    expect(dashboard.getCell("F26").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(dashboard.getCell("F26").value.result).toBeCloseTo(part1E12Result || 0, 4);
    expect(part1.getCell("E19").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    const part1F19Value = part1.getCell("F19").value;
    expect(part1F19Value).toEqual(
      expect.objectContaining({ formula: expect.any(String) })
    );
    expect(part1.getCell("E19").value.result).toBeCloseTo(part1E12Result || 0, 4);
    const part1SecondaryTotal =
      part1F19Value && typeof part1F19Value === "object"
        ? Number(part1F19Value.result ?? 0)
        : 0;
    expect(part1SecondaryTotal).toBeCloseTo(0, 4);
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
    // BootcampEndorsementScoreCard now sources from performance_feedback.
    expect(endorsement.getCell("F12").value).toBe("Performance strength A");
    expect(endorsement.getCell("H12").value).toBe("Performance improvement A");
    expect(performance.getCell("F12").value).toBe("Performance strength A");
    expect(performance.getCell("H12").value).toBe("Performance improvement A");
    expect(part1.getCell("F12").value).toBe("Strong ownership");
    expect(part1.getCell("H12").value).toBe("Sharpen communication");
    expect(performance.getCell("F15").value).toBe("Performance strength D");
    expect(performance.getCell("H15").value).toBe("Performance improvement D");
    expect(part1.getCell("F15").value).toBe("Responsive to clients");
    expect(part1.getCell("H15").value).toBe("Improve SLA turnaround");

    // Weight correctness check (Category D contribution now 0.15).
    expect(performance.getCell("E15").value).toEqual(
      expect.objectContaining({ formula: expect.any(String), result: expect.any(Number) })
    );
    expect(performance.getCell("E15").value.result).toBeCloseTo(0.15, 4);

    // Regularization Endorsement computed scores should be fully cached.
    const perfF19Result = performance.getCell("F19").value.result || 0;
    const perfF20Result = performance.getCell("F20").value.result || 0;
    const getComputedCellNumber = (cellValue) =>
      cellValue && typeof cellValue === "object"
        ? Number(cellValue.result ?? 0)
        : Number(cellValue ?? 0);

    expect(getComputedCellNumber(regularization.getCell("E16").value)).toBeCloseTo(
      perfF19Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E17").value)).toBeCloseTo(
      perfF19Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E18").value)).toBeCloseTo(
      perfF19Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E19").value)).toBeCloseTo(
      perfF19Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E22").value)).toBeCloseTo(
      perfF20Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E23").value)).toBeCloseTo(
      perfF20Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E24").value)).toBeCloseTo(
      perfF20Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E25").value)).toBeCloseTo(
      perfF20Result,
      4
    );
    expect(getComputedCellNumber(regularization.getCell("E27").value)).toBeCloseTo(
      perfF19Result + perfF20Result,
      4
    );

    // Remove stale description comments and default current job title.
    expect(regularization.getCell("G16").value).toBeNull();
    expect(regularization.getCell("H16").value).toBeNull();
    expect(regularization.getCell("G19").value).toBeNull();
    expect(regularization.getCell("H19").value).toBeNull();
    expect(regularization.getCell("D34").value).toBeNull();
    expect(regularization.getCell("E34").value).toBeNull();
    expect(regularization.getCell("G57").value).toBe("JUAN DELA CRUZ");
    expect(regularization.getCell("H57").value).toBe("JUAN DELA CRUZ");

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

    // Sheet2 rating values should come only from evaluation scores.
    expect(sheet2.getCell("B2").value).toBe(5);
    expect(sheet2.getCell("B2").fill).toEqual(
      expect.objectContaining({
        type: "pattern",
        pattern: "solid",
        fgColor: expect.objectContaining({ argb: "FF4F6228" }),
      })
    );
    expect(sheet2.getCell("C2").value).toBe(2);
    expect(sheet2.getCell("C2").fill).toEqual(
      expect.objectContaining({
        type: "pattern",
        pattern: "solid",
        fgColor: expect.objectContaining({ argb: "FFC4D79B" }),
      })
    );
    expect(sheet2.getCell("D2").value).toBe(3);
    expect(sheet2.getCell("D2").fill).toEqual(
      expect.objectContaining({
        type: "pattern",
        pattern: "solid",
        fgColor: expect.objectContaining({ argb: "FF92D050" }),
      })
    );
    expect(sheet2.getCell("E2").value).toBeNull();
    expect(sheet2.getCell("B3").value).toBeNull();

    // Summary cleanup checks.
    expect(summary.getCell("F13").value).toBeNull();
    expect(summary.getCell("I13").value).toBeNull();
    expect(summary.getCell("K13").value).toBeNull();
    expect(summary.getCell("J4").value).toBe("Consistently failed to expectations.");
    expect(checklist).toBeUndefined();
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
    const sheet2 = workbook.getWorksheet("Sheet2");
    const checklist = workbook.getWorksheet("Checklist");

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
    expect(sheet2.getCell("B2").value).toBeNull();
    expect(sheet2.getCell("F9").value).toBeNull();
    expect(sheet2.getCell("B2").fill).not.toEqual(
      expect.objectContaining({ pattern: "solid" })
    );
    expect(checklist).toBeUndefined();
    expect(scorecard.getCell("D47").value).toBe("☐");
    expect(scorecard.getCell("F47").value).toBe("☐");
  });
});

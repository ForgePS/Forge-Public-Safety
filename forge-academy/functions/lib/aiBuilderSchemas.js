const VALID_WIDGET_TYPES = new Set([
  "weather", "clock", "announcements", "emergency", "student_stats",
  "instructor_dashboard", "testing_status", "certification_status", "housing_status",
  "lms_progress", "dining", "certification_metrics", "active911", "cad_dashboard",
  "qr_code", "video", "pdf", "office", "html",
]);

const VALID_QUESTION_TYPES = new Set([
  "multiple_choice", "true_false", "multiple_select", "short_answer", "scenario",
]);

const VALID_TEMPLATE_IDS = new Set([
  "lobby", "classroom", "testing_center", "executive", "housing", "dining_hall", "custom",
]);

const GRID_COLS = 12;
const GRID_ROWS = 8;

function validateLayoutZone(zone) {
  const errors = [];
  if (!zone || typeof zone !== "object") return { valid: false, errors: ["Zone must be an object."] };
  const widgetType = String(zone.widgetType ?? "").trim();
  if (!VALID_WIDGET_TYPES.has(widgetType)) errors.push(`Invalid widgetType: ${widgetType}`);
  const x = Number(zone.x ?? 0);
  const y = Number(zone.y ?? 0);
  const w = Number(zone.w ?? 1);
  const h = Number(zone.h ?? 1);
  if (x < 0 || x >= GRID_COLS) errors.push("Zone x out of range.");
  if (y < 0 || y >= GRID_ROWS) errors.push("Zone y out of range.");
  if (w < 1 || x + w > GRID_COLS) errors.push("Zone width invalid.");
  if (h < 1 || y + h > GRID_ROWS) errors.push("Zone height invalid.");
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    zone: {
      id: String(zone.id ?? `zone-${Math.random().toString(36).slice(2, 8)}`),
      widgetType,
      x: Math.floor(x),
      y: Math.floor(y),
      w: Math.floor(w),
      h: Math.floor(h),
    },
  };
}

export function validateSignageLayoutOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const name = String(output.name ?? "").trim();
  const templateId = String(output.templateId ?? "custom").trim();
  if (!name) errors.push("Layout name is required.");
  if (templateId && !VALID_TEMPLATE_IDS.has(templateId)) errors.push(`Invalid templateId: ${templateId}`);
  if (!Array.isArray(output.zones) || !output.zones.length) errors.push("At least one zone is required.");

  const zones = [];
  if (Array.isArray(output.zones)) {
    for (let i = 0; i < output.zones.length; i += 1) {
      const result = validateLayoutZone(output.zones[i]);
      if (!result.valid) errors.push(`Zone ${i + 1}: ${result.errors.join(" ")}`);
      else if (result.zone) zones.push(result.zone);
    }
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: { name, templateId: VALID_TEMPLATE_IDS.has(templateId) ? templateId : "custom", zones },
  };
}

function validateQuestionOutput(question) {
  const errors = [];
  if (!question || typeof question !== "object") return { valid: false, errors: ["Question must be an object."] };
  const questionText = String(question.questionText ?? "").trim();
  if (!questionText) errors.push("questionText is required.");
  const questionType = String(question.questionType ?? "multiple_choice").trim();
  if (!VALID_QUESTION_TYPES.has(questionType)) errors.push(`Invalid questionType: ${questionType}`);

  let answerOptions = [];
  if (Array.isArray(question.answerOptions)) {
    answerOptions = question.answerOptions.map((opt, index) => ({
      id: String(opt?.id ?? String.fromCharCode(97 + index)),
      text: String(opt?.text ?? "").trim(),
      isCorrect: Boolean(opt?.isCorrect),
    }));
  }
  if (["multiple_choice", "true_false", "multiple_select"].includes(questionType) && !answerOptions.length) {
    errors.push("answerOptions required.");
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: {
      questionText,
      questionType,
      answerOptions,
      correctAnswerText: String(question.correctAnswerText ?? "").trim(),
      explanation: String(question.explanation ?? "").trim(),
      points: Number(question.points ?? 1) || 1,
      difficulty: ["easy", "medium", "hard"].includes(String(question.difficulty)) ? String(question.difficulty) : "medium",
      category: String(question.category ?? "").trim(),
      tags: Array.isArray(question.tags) ? question.tags.map(String) : [],
      reference: String(question.reference ?? "").trim(),
      flaggedForReview: question.flaggedForReview !== false,
    },
  };
}

export function validateQuestionBankOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  if (!Array.isArray(output.questions) || !output.questions.length) {
    return { valid: false, errors: ["At least one question is required."] };
  }
  const errors = [];
  const questions = [];
  for (let i = 0; i < output.questions.length; i += 1) {
    const result = validateQuestionOutput(output.questions[i]);
    if (!result.valid) errors.push(`Question ${i + 1}: ${result.errors.join(" ")}`);
    else if (result.data) questions.push(result.data);
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], data: { questions } };
}

export function validateTestBlueprintOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const testName = String(output.testName ?? "").trim();
  if (!testName) errors.push("testName is required.");
  const totalQuestions = Number(output.totalQuestions ?? 0);
  const passingScore = Number(output.passingScore ?? 70);
  if (totalQuestions < 1) errors.push("totalQuestions must be at least 1.");
  if (passingScore < 1 || passingScore > 100) errors.push("passingScore must be 1-100.");

  const poolRules = Array.isArray(output.poolRules)
    ? output.poolRules.map((rule) => ({
        questionPoolId: String(rule?.questionPoolId ?? "").trim(),
        numberOfQuestions: Number(rule?.numberOfQuestions ?? 0) || 0,
        difficultyMix: rule?.difficultyMix && typeof rule.difficultyMix === "object" ? rule.difficultyMix : {},
      }))
    : [];

  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: {
      testName,
      totalQuestions: Math.floor(totalQuestions),
      passingScore: Math.floor(passingScore),
      timeLimitMinutes: output.timeLimitMinutes == null ? null : Number(output.timeLimitMinutes) || null,
      randomizeQuestions: output.randomizeQuestions !== false,
      randomizeAnswers: output.randomizeAnswers !== false,
      allowRetakes: Boolean(output.allowRetakes),
      maxAttempts: output.maxAttempts == null ? null : Number(output.maxAttempts) || null,
      poolRules,
      summary: String(output.summary ?? "").trim(),
    },
  };
}

export function validateAiBuilderOutput(targetType, output) {
  switch (targetType) {
    case "signageLayout":
      return validateSignageLayoutOutput(output);
    case "questionBank":
      return validateQuestionBankOutput(output);
    case "testBlueprint":
      return validateTestBlueprintOutput(output);
    default:
      return { valid: false, errors: [`Unknown targetType: ${targetType}`] };
  }
}

export { VALID_WIDGET_TYPES, VALID_TEMPLATE_IDS };

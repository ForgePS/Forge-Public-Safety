/** @typedef {'signageLayout' | 'questionBank' | 'testBlueprint'} AiBuilderTargetType */

export const AI_BUILDER_TARGET_TYPES = /** @type {const} */ ([
  "signageLayout",
  "questionBank",
  "testBlueprint",
]);

export const VALID_WIDGET_TYPES = new Set([
  "weather",
  "clock",
  "announcements",
  "emergency",
  "student_stats",
  "instructor_dashboard",
  "testing_status",
  "certification_status",
  "housing_status",
  "lms_progress",
  "dining",
  "certification_metrics",
  "active911",
  "cad_dashboard",
  "qr_code",
  "video",
  "pdf",
  "office",
  "html",
]);

export const VALID_QUESTION_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "multiple_select",
  "short_answer",
  "scenario",
]);

export const VALID_TEMPLATE_IDS = new Set([
  "lobby",
  "classroom",
  "testing_center",
  "executive",
  "housing",
  "dining_hall",
  "custom",
]);

const GRID_COLS = 12;
const GRID_ROWS = 8;

/**
 * @param {unknown} zone
 * @returns {{ valid: boolean, errors: string[], zone?: Record<string, unknown> }}
 */
export function validateLayoutZone(zone) {
  const errors = [];
  if (!zone || typeof zone !== "object") {
    return { valid: false, errors: ["Zone must be an object."] };
  }
  const z = /** @type {Record<string, unknown>} */ (zone);
  const widgetType = String(z.widgetType ?? "").trim();
  if (!VALID_WIDGET_TYPES.has(widgetType)) {
    errors.push(`Invalid widgetType: ${widgetType}`);
  }
  const x = Number(z.x ?? 0);
  const y = Number(z.y ?? 0);
  const w = Number(z.w ?? 1);
  const h = Number(z.h ?? 1);
  if (!Number.isFinite(x) || x < 0 || x >= GRID_COLS) errors.push("Zone x out of range.");
  if (!Number.isFinite(y) || y < 0 || y >= GRID_ROWS) errors.push("Zone y out of range.");
  if (!Number.isFinite(w) || w < 1 || x + w > GRID_COLS) errors.push("Zone width invalid.");
  if (!Number.isFinite(h) || h < 1 || y + h > GRID_ROWS) errors.push("Zone height invalid.");

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    zone: {
      id: String(z.id ?? `zone-${Math.random().toString(36).slice(2, 8)}`),
      widgetType,
      x: Math.floor(x),
      y: Math.floor(y),
      w: Math.floor(w),
      h: Math.floor(h),
    },
  };
}

/**
 * @param {unknown} output
 * @returns {{ valid: boolean, errors: string[], data?: Record<string, unknown> }}
 */
export function validateSignageLayoutOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") {
    return { valid: false, errors: ["Output must be an object."] };
  }
  const o = /** @type {Record<string, unknown>} */ (output);
  const name = String(o.name ?? "").trim();
  const templateId = String(o.templateId ?? "custom").trim();
  if (!name) errors.push("Layout name is required.");
  if (templateId && !VALID_TEMPLATE_IDS.has(templateId)) {
    errors.push(`Invalid templateId: ${templateId}`);
  }
  if (!Array.isArray(o.zones) || !o.zones.length) {
    errors.push("At least one zone is required.");
  }

  /** @type {Record<string, unknown>[]} */
  const zones = [];
  if (Array.isArray(o.zones)) {
    for (let i = 0; i < o.zones.length; i += 1) {
      const result = validateLayoutZone(o.zones[i]);
      if (!result.valid) {
        errors.push(`Zone ${i + 1}: ${result.errors.join(" ")}`);
      } else if (result.zone) {
        zones.push(result.zone);
      }
    }
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      name,
      templateId: VALID_TEMPLATE_IDS.has(templateId) ? templateId : "custom",
      zones,
    },
  };
}

/**
 * @param {unknown} question
 * @returns {{ valid: boolean, errors: string[], data?: Record<string, unknown> }}
 */
export function validateQuestionOutput(question) {
  const errors = [];
  if (!question || typeof question !== "object") {
    return { valid: false, errors: ["Question must be an object."] };
  }
  const q = /** @type {Record<string, unknown>} */ (question);
  const questionText = String(q.questionText ?? "").trim();
  if (!questionText) errors.push("questionText is required.");

  const questionType = String(q.questionType ?? "multiple_choice").trim();
  if (!VALID_QUESTION_TYPES.has(questionType)) {
    errors.push(`Invalid questionType: ${questionType}`);
  }

  /** @type {Array<{ id: string, text: string, isCorrect: boolean }>} */
  let answerOptions = [];
  if (Array.isArray(q.answerOptions)) {
    answerOptions = q.answerOptions.map((opt, index) => {
      const row = /** @type {Record<string, unknown>} */ (opt ?? {});
      return {
        id: String(row.id ?? String.fromCharCode(97 + index)),
        text: String(row.text ?? "").trim(),
        isCorrect: Boolean(row.isCorrect),
      };
    });
  }

  if (["multiple_choice", "true_false", "multiple_select"].includes(questionType) && !answerOptions.length) {
    errors.push("answerOptions required for selected question type.");
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      questionText,
      questionType,
      answerOptions,
      correctAnswerText: String(q.correctAnswerText ?? "").trim(),
      explanation: String(q.explanation ?? "").trim(),
      points: Number(q.points ?? 1) || 1,
      difficulty: ["easy", "medium", "hard"].includes(String(q.difficulty)) ? String(q.difficulty) : "medium",
      category: String(q.category ?? "").trim(),
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
      reference: String(q.reference ?? "").trim(),
      flaggedForReview: q.flaggedForReview !== false,
    },
  };
}

/**
 * @param {unknown} output
 * @returns {{ valid: boolean, errors: string[], data?: Record<string, unknown> }}
 */
export function validateQuestionBankOutput(output) {
  if (!output || typeof output !== "object") {
    return { valid: false, errors: ["Output must be an object."] };
  }
  const o = /** @type {Record<string, unknown>} */ (output);
  if (!Array.isArray(o.questions) || !o.questions.length) {
    return { valid: false, errors: ["At least one question is required."] };
  }

  const errors = [];
  /** @type {Record<string, unknown>[]} */
  const questions = [];
  for (let i = 0; i < o.questions.length; i += 1) {
    const result = validateQuestionOutput(o.questions[i]);
    if (!result.valid) {
      errors.push(`Question ${i + 1}: ${result.errors.join(" ")}`);
    } else if (result.data) {
      questions.push(result.data);
    }
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], data: { questions } };
}

/**
 * @param {unknown} output
 * @returns {{ valid: boolean, errors: string[], data?: Record<string, unknown> }}
 */
export function validateTestBlueprintOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") {
    return { valid: false, errors: ["Output must be an object."] };
  }
  const o = /** @type {Record<string, unknown>} */ (output);
  const testName = String(o.testName ?? "").trim();
  if (!testName) errors.push("testName is required.");

  const totalQuestions = Number(o.totalQuestions ?? 0);
  const passingScore = Number(o.passingScore ?? 70);
  if (!Number.isFinite(totalQuestions) || totalQuestions < 1) errors.push("totalQuestions must be at least 1.");
  if (!Number.isFinite(passingScore) || passingScore < 1 || passingScore > 100) {
    errors.push("passingScore must be between 1 and 100.");
  }

  /** @type {Record<string, unknown>[]} */
  const poolRules = [];
  if (Array.isArray(o.poolRules)) {
    for (const rule of o.poolRules) {
      const r = /** @type {Record<string, unknown>} */ (rule ?? {});
      poolRules.push({
        questionPoolId: String(r.questionPoolId ?? "").trim(),
        numberOfQuestions: Number(r.numberOfQuestions ?? 0) || 0,
        difficultyMix: r.difficultyMix && typeof r.difficultyMix === "object" ? r.difficultyMix : {},
      });
    }
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      testName,
      totalQuestions: Math.floor(totalQuestions),
      passingScore: Math.floor(passingScore),
      timeLimitMinutes: o.timeLimitMinutes == null ? null : Number(o.timeLimitMinutes) || null,
      randomizeQuestions: o.randomizeQuestions !== false,
      randomizeAnswers: o.randomizeAnswers !== false,
      allowRetakes: Boolean(o.allowRetakes),
      maxAttempts: o.maxAttempts == null ? null : Number(o.maxAttempts) || null,
      poolRules,
      summary: String(o.summary ?? "").trim(),
    },
  };
}

/**
 * @param {AiBuilderTargetType} targetType
 * @param {unknown} output
 */
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

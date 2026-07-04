const VALID_WIDGET_TYPES = new Set([
  "weather", "clock", "announcements", "emergency", "student_stats",
  "instructor_dashboard", "testing_status", "certification_status", "housing_status",
  "lms_progress", "dining", "certification_metrics", "active911", "cad_dashboard",
  "qr_code", "video", "pdf", "office", "html",
  "alerts", "units", "incidents", "kpi", "media", "training_classes",
]);

const MODULE_KINDS = new Set(["checkoff", "inventory", "inspection", "custom"]);
const MODULE_FIELD_TYPES = new Set([
  "text", "textarea", "number", "boolean", "select", "pass_fail", "date", "time", "photo", "signature", "barcode",
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

export function validateSignagePlaylistOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const name = String(output.name ?? "").trim();
  if (!name) errors.push("name is required.");
  const itemIds = Array.isArray(output.itemIds) ? output.itemIds.map(String) : [];
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: {
      name,
      description: String(output.description ?? "").trim(),
      itemIds,
      loop: output.loop !== false,
      transition: ["fade", "slide", "none"].includes(String(output.transition)) ? String(output.transition) : "fade",
      priority: Number(output.priority ?? 1) || 1,
      suggestedMediaTitles: Array.isArray(output.suggestedMediaTitles) ? output.suggestedMediaTitles.map(String) : [],
    },
  };
}

export function validateSignageMediaOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const title = String(output.title ?? "").trim();
  if (!title) errors.push("title is required.");
  const type = String(output.type ?? "image");
  if (!["image", "video", "pdf", "announcement", "widget"].includes(type)) errors.push("Invalid media type.");
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: {
      title,
      type,
      description: String(output.description ?? "").trim(),
      category: String(output.category ?? "general"),
      durationSec: Number(output.durationSec ?? 10) || 10,
      tags: Array.isArray(output.tags) ? output.tags.map(String) : [],
    },
  };
}

export function validateGradingAssistOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const pointsAwarded = Number(output.pointsAwarded ?? output.suggestedPoints ?? 0);
  const maxPoints = Number(output.maxPoints ?? 0);
  if (maxPoints > 0 && pointsAwarded > maxPoints) {
    return { valid: false, errors: ["pointsAwarded exceeds maxPoints."] };
  }
  return {
    valid: true,
    errors: [],
    data: {
      pointsAwarded,
      graderNotes: String(output.graderNotes ?? output.notes ?? "").trim(),
      confidence: Number(output.confidence ?? 0.7),
      rationale: String(output.rationale ?? "").trim(),
    },
  };
}

export function validateGradingRubricOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const criteria = Array.isArray(output.criteria)
    ? output.criteria.map((c, i) => ({
        id: String(c?.id ?? `criterion-${i + 1}`),
        label: String(c?.label ?? "").trim(),
        maxPoints: Number(c?.maxPoints ?? 0) || 0,
        description: String(c?.description ?? "").trim(),
      }))
    : [];
  if (!criteria.length) return { valid: false, errors: ["At least one rubric criterion is required."] };
  return {
    valid: true,
    errors: [],
    data: { name: String(output.name ?? "Grading rubric").trim(), criteria, totalPoints: criteria.reduce((s, c) => s + c.maxPoints, 0) },
  };
}

export function validateSkillTemplateOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const name = String(output.name ?? "").trim();
  if (!name) return { valid: false, errors: ["name is required."] };
  const skills = Array.isArray(output.skills)
    ? output.skills.map((s, i) => ({
        name: String(s?.name ?? `Skill ${i + 1}`).trim(),
        description: String(s?.description ?? "").trim(),
        sortOrder: Number(s?.sortOrder ?? i),
        maxScore: Number(s?.maxScore ?? 100) || 100,
        passingScore: Number(s?.passingScore ?? 70) || 70,
      }))
    : [];
  if (!skills.length) return { valid: false, errors: ["At least one skill line item is required."] };
  return { valid: true, errors: [], data: { name, description: String(output.description ?? "").trim(), skills } };
}

export function validateCertificateTemplateOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const name = String(output.name ?? "").trim();
  if (!name) return { valid: false, errors: ["name is required."] };
  const fields = Array.isArray(output.fields)
    ? output.fields.map((f, i) => ({
        id: String(f?.id ?? `field-${i + 1}`),
        type: f?.type === "static" ? "static" : "merge",
        mergeKey: String(f?.mergeKey ?? ""),
        staticText: String(f?.staticText ?? ""),
        label: String(f?.label ?? "").trim(),
        x: Number(f?.x ?? 10),
        y: Number(f?.y ?? 10 + i * 8),
        fontSize: Number(f?.fontSize ?? 14) || 14,
        align: ["left", "center", "right"].includes(String(f?.align)) ? String(f?.align) : "center",
        color: String(f?.color ?? "#111111"),
      }))
    : [];
  return {
    valid: true,
    errors: [],
    data: {
      name,
      descriptionText: String(output.descriptionText ?? "").trim(),
      fields,
      layoutHint: String(output.layoutHint ?? "custom_image"),
    },
  };
}

export function validateSignageDisplayOutput(output) {
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const name = String(output.name ?? "").trim();
  if (!name) return { valid: false, errors: ["name is required."] };
  return {
    valid: true,
    errors: [],
    data: {
      name,
      location: String(output.location ?? "").trim(),
      station: String(output.station ?? "").trim(),
      displayType: String(output.displayType ?? "information"),
      layoutId: String(output.layoutId ?? "").trim(),
      playlistId: String(output.playlistId ?? "").trim(),
      notes: String(output.notes ?? "").trim(),
    },
  };
}

function validateModuleField(field, index, errors) {
  if (!field || typeof field !== "object") {
    errors.push(`Field ${index + 1}: invalid.`);
    return null;
  }
  const type = String(field.type ?? "text");
  if (!MODULE_FIELD_TYPES.has(type)) errors.push(`Field ${index + 1}: invalid type.`);
  return {
    key: String(field.key ?? `field_${index + 1}`),
    label: String(field.label ?? `Field ${index + 1}`),
    type,
    required: field.required !== false,
    options: Array.isArray(field.options) ? field.options : [],
  };
}

export function validateModuleDefinitionOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["ModuleDefinition required."] };
  const name = String(output.name ?? "").trim();
  const kind = String(output.kind ?? "custom");
  if (!name) errors.push("name is required.");
  if (!MODULE_KINDS.has(kind)) errors.push(`Invalid kind: ${kind}`);
  const sections = [];
  if (Array.isArray(output.sections)) {
    for (let si = 0; si < output.sections.length; si += 1) {
      const sec = output.sections[si] ?? {};
      const items = [];
      if (Array.isArray(sec.items)) {
        for (let fi = 0; fi < sec.items.length; fi += 1) {
          const f = validateModuleField(sec.items[fi], fi, errors);
          if (f) items.push(f);
        }
      }
      sections.push({ id: String(sec.id ?? `section-${si + 1}`), title: String(sec.title ?? `Section ${si + 1}`), items });
    }
  }
  if (!sections.some((s) => s.items.length)) errors.push("At least one field is required.");
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: { name, kind, description: String(output.description ?? "").trim(), status: "draft", sections, rules: output.rules ?? {} },
  };
}

export function validateAiBuilderOutput(targetType, output) {
  switch (targetType) {
    case "signageLayout":
      return validateSignageLayoutOutput(output);
    case "signagePlaylist":
      return validateSignagePlaylistOutput(output);
    case "signageMedia":
      return validateSignageMediaOutput(output);
    case "signageDisplay":
      return validateSignageDisplayOutput(output);
    case "questionBank":
      return validateQuestionBankOutput(output);
    case "testBlueprint":
      return validateTestBlueprintOutput(output);
    case "gradingAssist":
      return validateGradingAssistOutput(output);
    case "gradingRubric":
      return validateGradingRubricOutput(output);
    case "skillTemplate":
      return validateSkillTemplateOutput(output);
    case "certificateTemplate":
      return validateCertificateTemplateOutput(output);
    case "moduleCheckoff":
      return validateModuleDefinitionOutput({ ...output, kind: output?.kind || "checkoff" });
    case "moduleInventory":
      return validateModuleDefinitionOutput({ ...output, kind: output?.kind || "inventory" });
    case "moduleInspection":
      return validateModuleDefinitionOutput({ ...output, kind: output?.kind || "inspection" });
    case "moduleCustom":
      return validateModuleDefinitionOutput({ ...output, kind: output?.kind || "custom" });
    default:
      return { valid: false, errors: [`Unknown targetType: ${targetType}`] };
  }
}

export { VALID_WIDGET_TYPES, VALID_TEMPLATE_IDS };

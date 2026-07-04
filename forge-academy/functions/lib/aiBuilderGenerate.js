import { VALID_TEMPLATE_IDS } from "./aiBuilderSchemas.js";

const LAYOUT_TEMPLATES = {
  lobby: [
    { id: "main", widgetType: "announcements", x: 0, y: 0, w: 8, h: 8 },
    { id: "clock", widgetType: "clock", x: 8, y: 0, w: 4, h: 2 },
    { id: "weather", widgetType: "weather", x: 8, y: 2, w: 4, h: 2 },
    { id: "dining", widgetType: "dining", x: 8, y: 4, w: 4, h: 4 },
  ],
  classroom: [
    { id: "main", widgetType: "announcements", x: 0, y: 0, w: 9, h: 8 },
    { id: "testing", widgetType: "testing_status", x: 9, y: 0, w: 3, h: 4 },
    { id: "clock", widgetType: "clock", x: 9, y: 4, w: 3, h: 4 },
  ],
  testing_center: [
    { id: "testing", widgetType: "testing_status", x: 0, y: 0, w: 8, h: 8 },
    { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
    { id: "clock", widgetType: "clock", x: 8, y: 4, w: 4, h: 4 },
  ],
  executive: [
    { id: "analytics", widgetType: "student_stats", x: 0, y: 0, w: 6, h: 4 },
    { id: "cert", widgetType: "certification_status", x: 6, y: 0, w: 6, h: 4 },
    { id: "announcements", widgetType: "announcements", x: 0, y: 4, w: 12, h: 4 },
  ],
  housing: [
    { id: "housing", widgetType: "housing_status", x: 0, y: 0, w: 8, h: 8 },
    { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
    { id: "clock", widgetType: "clock", x: 8, y: 4, w: 4, h: 4 },
  ],
  dining_hall: [
    { id: "dining", widgetType: "dining", x: 0, y: 0, w: 8, h: 8 },
    { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
    { id: "weather", widgetType: "weather", x: 8, y: 4, w: 4, h: 4 },
  ],
};

function detectTemplateFromPrompt(prompt = "") {
  const lower = prompt.toLowerCase();
  if (lower.includes("classroom") || lower.includes("class")) return "classroom";
  if (lower.includes("testing") || lower.includes("exam")) return "testing_center";
  if (lower.includes("executive") || lower.includes("analytics")) return "executive";
  if (lower.includes("housing") || lower.includes("dorm")) return "housing";
  if (lower.includes("dining") || lower.includes("cafeteria") || lower.includes("meal")) return "dining_hall";
  return "lobby";
}

function extractLayoutName(prompt = "", currentState = {}) {
  const trimmed = prompt.trim();
  if (trimmed.length <= 80) return trimmed || currentState.name || "AI Generated Layout";
  return `${trimmed.slice(0, 77)}...`;
}

function parseCsvQuestions(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const questions = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx] ?? ""]));
    const questionText = row.questiontext || row.question || "";
    if (!questionText) continue;

    const options = [
      { id: "a", text: row.optiona || row.a || "", isCorrect: false },
      { id: "b", text: row.optionb || row.b || "", isCorrect: false },
      { id: "c", text: row.optionc || row.c || "", isCorrect: false },
      { id: "d", text: row.optiond || row.d || "", isCorrect: false },
    ].filter((o) => o.text);

    const answer = (row.correctanswer || row.answer || "A").toUpperCase();
    for (const opt of options) {
      if (answer === opt.id.toUpperCase() || answer === opt.text.toUpperCase()) {
        opt.isCorrect = true;
      }
    }

    questions.push({
      questionText,
      questionType: "multiple_choice",
      answerOptions: options.length ? options : [
        { id: "a", text: "True", isCorrect: answer === "TRUE" || answer === "A" },
        { id: "b", text: "False", isCorrect: answer === "FALSE" || answer === "B" },
      ],
      difficulty: row.difficulty?.startsWith("e") ? "easy" : row.difficulty?.startsWith("h") ? "hard" : "medium",
      points: Number(row.points) || 1,
      flaggedForReview: true,
    });
  }
  return questions;
}

function generateQuestionsFromPrompt(prompt = "", count = 5) {
  const topic = prompt.trim() || "firefighter training";
  const questions = [];
  for (let i = 0; i < count; i += 1) {
    questions.push({
      questionText: `Regarding ${topic}, which statement is most accurate? (Question ${i + 1})`,
      questionType: "multiple_choice",
      answerOptions: [
        { id: "a", text: "The first option applies in standard operating procedures.", isCorrect: i % 4 === 0 },
        { id: "b", text: "The second option reflects best practice for this scenario.", isCorrect: i % 4 === 1 },
        { id: "c", text: "The third option is required by academy policy.", isCorrect: i % 4 === 2 },
        { id: "d", text: "None of the above statements are correct.", isCorrect: i % 4 === 3 },
      ],
      explanation: `Review course materials related to: ${topic}.`,
      difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
      points: 1,
      flaggedForReview: true,
    });
  }
  return questions;
}

function parseBlueprintFromPrompt(prompt = "", currentState = {}, context = {}) {
  const lower = prompt.toLowerCase();
  const numberMatch = lower.match(/(\d+)\s*questions?/);
  const passMatch = lower.match(/(\d+)\s*%\s*pass|pass(?:ing)?\s*(?:score\s*)?(\d+)/);
  const timeMatch = lower.match(/(\d+)\s*(?:min|minute)/);

  const totalQuestions = numberMatch ? Number(numberMatch[1]) : Number(currentState.totalQuestions) || 50;
  const passingScore = passMatch ? Number(passMatch[1] || passMatch[2]) : Number(currentState.passingScore) || 70;
  const timeLimitMinutes = timeMatch ? Number(timeMatch[1]) : currentState.timeLimitMinutes ?? 120;

  const poolRules = Array.isArray(context.poolRules) && context.poolRules.length
    ? context.poolRules.map((rule) => ({
        questionPoolId: String(rule.questionPoolId ?? rule.id ?? ""),
        numberOfQuestions: Number(rule.numberOfQuestions) || Math.floor(totalQuestions / context.poolRules.length),
      }))
    : [];

  return {
    testName: currentState.testName || extractLayoutName(prompt) || "AI Generated Exam",
    totalQuestions,
    passingScore,
    timeLimitMinutes,
    randomizeQuestions: true,
    randomizeAnswers: true,
    allowRetakes: lower.includes("retake"),
    maxAttempts: lower.includes("retake") ? 2 : null,
    poolRules,
    summary: `Generated from prompt: ${prompt.slice(0, 200)}`,
  };
}

function buildSystemPrompt(targetType, currentState, context) {
  const widgetList = [
    "weather", "clock", "announcements", "emergency", "student_stats", "testing_status",
    "certification_status", "housing_status", "dining", "video", "pdf",
  ].join(", ");

  if (targetType === "signageLayout") {
    return `You generate JSON for a digital signage layout on a 12x8 grid.
Return ONLY valid JSON with keys: name (string), templateId (one of: lobby, classroom, testing_center, executive, housing, dining_hall, custom), zones (array).
Each zone: id, widgetType (one of: ${widgetList}), x, y, w, h (integers). Zones must fit within 12 columns and 8 rows.
Current layout: ${JSON.stringify(currentState?.zones ?? [])}`;
  }
  if (targetType === "questionBank") {
    return `You generate JSON for a test question bank. Return ONLY valid JSON: { "questions": [...] }.
Each question: questionText, questionType (multiple_choice|true_false|multiple_select|short_answer|scenario), answerOptions [{id,text,isCorrect}], explanation, difficulty (easy|medium|hard), points, flaggedForReview (true).
Generate exam-quality questions for firefighter/academy training.`;
  }
  if (targetType === "testBlueprint") {
    return `You generate JSON for a test blueprint: testName, totalQuestions, passingScore, timeLimitMinutes, randomizeQuestions, randomizeAnswers, allowRetakes, poolRules [{questionPoolId, numberOfQuestions}].
Available pools: ${JSON.stringify(context?.pools ?? [])}`;
  }
  return "Return valid JSON only.";
}

async function callOpenAi({ apiKey, model, systemPrompt, userPrompt, attachments = [] }) {
  /** @type {Array<Record<string, unknown>>} */
  const userContent = [{ type: "text", text: userPrompt || "Generate the requested configuration." }];

  for (const file of attachments) {
    if (file.mimeType?.startsWith("image/") && file.base64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
      });
    } else if (file.textContent) {
      userContent.push({ type: "text", text: `File ${file.name}:\n${file.textContent.slice(0, 12000)}` });
    }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent.length === 1 ? userPrompt : userContent },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response.");
  return JSON.parse(content);
}

function fallbackGenerate(targetType, prompt, currentState, context, attachments) {
  if (targetType === "signageLayout") {
    const templateId = detectTemplateFromPrompt(prompt);
    const zones = LAYOUT_TEMPLATES[templateId] || LAYOUT_TEMPLATES.lobby;
    return {
      name: extractLayoutName(prompt, currentState),
      templateId: VALID_TEMPLATE_IDS.has(templateId) ? templateId : "lobby",
      zones: zones.map((z) => ({ ...z, id: `${z.id}-${Math.random().toString(36).slice(2, 5)}` })),
    };
  }

  if (targetType === "questionBank") {
    let questions = [];
    for (const file of attachments) {
      if (file.textContent?.includes(",")) {
        questions = questions.concat(parseCsvQuestions(file.textContent));
      }
    }
    if (!questions.length) {
      const countMatch = prompt.match(/(\d+)\s*questions?/i);
      const count = countMatch ? Math.min(Number(countMatch[1]), 25) : 5;
      questions = generateQuestionsFromPrompt(prompt, count);
    }
    return { questions };
  }

  if (targetType === "testBlueprint") {
    return parseBlueprintFromPrompt(prompt, currentState, context);
  }

  throw new Error(`Unsupported targetType: ${targetType}`);
}

/**
 * @param {{
 *   targetType: string,
 *   userPrompt: string,
 *   currentState?: Record<string, unknown>,
 *   context?: Record<string, unknown>,
 *   attachments?: Array<{ name?: string, mimeType?: string, base64?: string, textContent?: string }>,
 * }} input
 */
export async function generateAiBuilderOutput(input) {
  const { targetType, userPrompt = "", currentState = {}, context = {}, attachments = [] } = input;
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_BUILDER_OPENAI_API_KEY || "";
  const model = process.env.AI_BUILDER_MODEL || "gpt-4o-mini";

  if (apiKey) {
    try {
      const systemPrompt = buildSystemPrompt(targetType, currentState, context);
      const raw = await callOpenAi({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        attachments,
      });
      return { output: raw, model, source: "openai" };
    } catch (error) {
      console.warn("OpenAI generation failed, using fallback:", error);
    }
  }

  const output = fallbackGenerate(targetType, userPrompt, currentState, context, attachments);
  return { output, model: "fallback", source: "fallback" };
}

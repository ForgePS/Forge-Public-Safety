/** Parse uploaded question file (CSV or Excel).
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: Record<string, string>[] }>}
 */
export async function parseQuestionUploadFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) return { headers: [], rows: [] };
    const headers = Object.keys(rows[0]);
    return {
      headers,
      rows: rows.map((row) =>
        Object.fromEntries(headers.map((header) => [header, String(row[header] ?? "").trim()])),
      ),
    };
  }

  const text = await file.text();
  return parseCsvRows(text);
}

/** @param {string} value */
function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** @param {Record<string, string>} row */
function pick(row, ...keys) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    const match = entries.find(([header]) => normalizeHeader(header) === normalized);
    if (match && match[1]) return match[1].trim();
  }
  return "";
}

/** @param {string} value */
function normalizeQuestionType(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "multiplechoice" || normalized === "mc") return "multiple_choice";
  if (normalized === "truefalse" || normalized === "tf") return "true_false";
  if (normalized === "multipleselect" || normalized === "ms") return "multiple_select";
  if (normalized === "shortanswer" || normalized === "sa") return "short_answer";
  if (normalized === "scenario") return "scenario";
  return normalized || "multiple_choice";
}

/** @param {string} value */
function normalizeDifficulty(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("e")) return "easy";
  if (normalized.startsWith("h")) return "hard";
  return "medium";
}

/** @param {string} correctAnswer @param {Array<{ id: string, text: string, isCorrect: boolean }>} options */
function markCorrectOptions(correctAnswer, options) {
  const answers = correctAnswer
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  return options.map((option, index) => {
    const letter = String.fromCharCode(65 + index);
    const isCorrect =
      answers.includes(letter) ||
      answers.includes(option.text.trim().toUpperCase()) ||
      (answers.length === 1 && option.text.trim().toLowerCase() === answers[0].toLowerCase());
    return { ...option, isCorrect };
  });
}

/**
 * @param {Record<string, string>[]} rows
 * @param {{
 *   courseId: string,
 *   questionBankId: string,
 *   resolvePoolId: (poolName: string) => Promise<string>,
 * }} context
 */
export async function mapImportRowsToQuestions(rows, context) {
  /** @type {import('./testQuestions.js').TestQuestionRecord[]} */
  const questions = [];
  /** @type {string[]} */
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const questionText = pick(row, "questionText", "question");
    if (!questionText) {
      errors.push(`Row ${rowNumber}: questionText is required.`);
      continue;
    }

    const poolName = pick(row, "questionPool", "pool");
    let questionPoolId = "";
    if (poolName) {
      try {
        questionPoolId = await context.resolvePoolId(poolName);
      } catch (err) {
        errors.push(`Row ${rowNumber}: ${err instanceof Error ? err.message : "Invalid pool."}`);
        continue;
      }
    }

    const questionType = normalizeQuestionType(pick(row, "questionType", "type"));
    const optionA = pick(row, "optionA", "a");
    const optionB = pick(row, "optionB", "b");
    const optionC = pick(row, "optionC", "c");
    const optionD = pick(row, "optionD", "d");
    const correctAnswer = pick(row, "correctAnswer", "answer");
    const tag = pick(row, "tag", "tags");

    /** @type {Array<{ id: string, text: string, isCorrect: boolean }>} */
    let answerOptions = [];
    if ([optionA, optionB, optionC, optionD].some(Boolean)) {
      answerOptions = [
        { id: "a", text: optionA, isCorrect: false },
        { id: "b", text: optionB, isCorrect: false },
        { id: "c", text: optionC, isCorrect: false },
        { id: "d", text: optionD, isCorrect: false },
      ].filter((option) => option.text);
      answerOptions = markCorrectOptions(correctAnswer, answerOptions);
    } else if (questionType === "true_false") {
      answerOptions = markCorrectOptions(correctAnswer || "True", [
        { id: "true", text: "True", isCorrect: false },
        { id: "false", text: "False", isCorrect: false },
      ]);
    }

    questions.push({
      id: "",
      questionBankId: context.questionBankId,
      questionPoolId,
      courseId: context.courseId,
      questionText,
      questionType,
      answerOptions,
      correctAnswerText: correctAnswer,
      explanation: pick(row, "explanation"),
      points: Number(pick(row, "points") || 1),
      difficulty: normalizeDifficulty(pick(row, "difficulty")),
      category: pick(row, "category"),
      tags: tag ? tag.split(/[,;|]/).map((item) => item.trim()).filter(Boolean) : [],
      reference: pick(row, "reference"),
      active: true,
      flaggedForReview: false,
    });
  }

  return { questions, errors };
}

/** @param {string} text */
export function parseCsvRows(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}

/** @param {string} line */
function splitCsvLine(line) {
  /** @type {string[]} */
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export const QUESTION_IMPORT_TEMPLATE = `courseCode,questionBank,questionPool,questionText,questionType,optionA,optionB,optionC,optionD,correctAnswer,points,difficulty,category,reference,tag,explanation
FF1,Firefighter I Bank,SCBA,What is the first step in donning SCBA?,multiple_choice,Inspect the unit,Connect regulator,Open cylinder valve,Check PASS device,A,1,easy,SCBA,NFPA 1404,scba,Inspect before donning
`;

export function downloadQuestionImportTemplate() {
  const blob = new Blob([QUESTION_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "question-import-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

import { FormField, FormSelect, FormTextarea } from "./StudentFormFields.jsx";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
} from "../lib/testQuestions.js";

const emptyQuestion = {
  questionText: "",
  questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  points: "1",
  difficulty: QUESTION_DIFFICULTIES.MEDIUM,
  category: "",
  reference: "",
  explanation: "",
  questionPoolId: "",
};

/**
 * @param {{
 *   value: typeof emptyQuestion,
 *   onChange: (value: typeof emptyQuestion) => void,
 *   pools: Array<{ id: string, poolName: string }>,
 *   onSubmit: () => void,
 *   saving?: boolean,
 *   submitLabel?: string,
 * }} props
 */
export default function QuestionEditor({
  value,
  onChange,
  pools,
  onSubmit,
  saving = false,
  submitLabel = "Save question",
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <FormTextarea
        label="Question text"
        name="questionText"
        value={value.questionText}
        onChange={(event) => onChange({ ...value, questionText: event.target.value })}
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormSelect
          label="Question type"
          name="questionType"
          value={value.questionType}
          onChange={(event) => onChange({ ...value, questionType: event.target.value })}
        >
          {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Pool"
          name="questionPoolId"
          value={value.questionPoolId}
          onChange={(event) => onChange({ ...value, questionPoolId: event.target.value })}
        >
          <option value="">Unassigned</option>
          {pools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.poolName}
            </option>
          ))}
        </FormSelect>
        <FormField
          label="Points"
          name="points"
          value={value.points}
          onChange={(event) => onChange({ ...value, points: event.target.value })}
        />
        <FormSelect
          label="Difficulty"
          name="difficulty"
          value={value.difficulty}
          onChange={(event) => onChange({ ...value, difficulty: event.target.value })}
        >
          <option value={QUESTION_DIFFICULTIES.EASY}>Easy</option>
          <option value={QUESTION_DIFFICULTIES.MEDIUM}>Medium</option>
          <option value={QUESTION_DIFFICULTIES.HARD}>Hard</option>
        </FormSelect>
        <FormField
          label="Category"
          name="category"
          value={value.category}
          onChange={(event) => onChange({ ...value, category: event.target.value })}
        />
        <FormField
          label="Reference"
          name="reference"
          value={value.reference}
          onChange={(event) => onChange({ ...value, reference: event.target.value })}
        />
      </div>

      {[QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTIPLE_SELECT, QUESTION_TYPES.TRUE_FALSE].includes(
        value.questionType,
      ) ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Option A" name="optionA" value={value.optionA} onChange={(event) => onChange({ ...value, optionA: event.target.value })} />
          <FormField label="Option B" name="optionB" value={value.optionB} onChange={(event) => onChange({ ...value, optionB: event.target.value })} />
          {value.questionType !== QUESTION_TYPES.TRUE_FALSE ? (
            <>
              <FormField label="Option C" name="optionC" value={value.optionC} onChange={(event) => onChange({ ...value, optionC: event.target.value })} />
              <FormField label="Option D" name="optionD" value={value.optionD} onChange={(event) => onChange({ ...value, optionD: event.target.value })} />
            </>
          ) : null}
          <FormField
            label="Correct answer"
            name="correctAnswer"
            value={value.correctAnswer}
            onChange={(event) => onChange({ ...value, correctAnswer: event.target.value })}
            hint="Use A/B/C/D or True/False"
          />
        </div>
      ) : (
        <FormField
          label="Correct answer text"
          name="correctAnswer"
          value={value.correctAnswer}
          onChange={(event) => onChange({ ...value, correctAnswer: event.target.value })}
        />
      )}

      <FormTextarea
        label="Explanation"
        name="explanation"
        value={value.explanation}
        onChange={(event) => onChange({ ...value, explanation: event.target.value })}
      />

      <button
        type="submit"
        disabled={saving}
        className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export { emptyQuestion };

/** @param {typeof emptyQuestion} form */
export function buildQuestionPayload(form, questionBankId, courseId) {
  const options = [
    { id: "a", text: form.optionA, isCorrect: false },
    { id: "b", text: form.optionB, isCorrect: false },
    { id: "c", text: form.optionC, isCorrect: false },
    { id: "d", text: form.optionD, isCorrect: false },
  ].filter((option) => option.text);

  const answers = form.correctAnswer
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const answerOptions = options.map((option, index) => {
    const letter = String.fromCharCode(65 + index);
    return {
      ...option,
      isCorrect:
        answers.includes(letter) ||
        answers.includes(option.text.trim().toUpperCase()) ||
        (answers.length === 1 && option.text.trim().toLowerCase() === answers[0].toLowerCase()),
    };
  });

  return {
    questionBankId,
    courseId,
    questionPoolId: form.questionPoolId,
    questionText: form.questionText,
    questionType: form.questionType,
    answerOptions,
    correctAnswerText: form.correctAnswer,
    explanation: form.explanation,
    points: Number(form.points || 1),
    difficulty: form.difficulty,
    category: form.category,
    reference: form.reference,
    tags: [],
    active: true,
    flaggedForReview: false,
  };
}

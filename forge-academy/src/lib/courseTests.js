import { listTestsByCourse } from "./tests.js";

/**
 * @param {{ id: string, requiredTestIds?: string[] }} course
 */
export async function getRequiredTestsForCourse(course) {
  const tests = await listTestsByCourse(course.id);
  if (!Array.isArray(course.requiredTestIds) || course.requiredTestIds.length === 0) {
    return tests;
  }
  const required = new Set(course.requiredTestIds);
  return tests.filter((test) => required.has(test.id));
}

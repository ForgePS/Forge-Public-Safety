import { PAGE_STATUS } from "./constants.js";
import { getBlockDef } from "../blocks/registry.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normalize to lowercase hyphenated slug. Converts slashes/underscores to hyphens. */
export function sanitizeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[\/_]+/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(slug) {
  if (!slug) return false;
  if (slug === "/" || slug === "home") return true;
  return SLUG_PATTERN.test(slug);
}

export function validatePage(page) {
  const errors = [];
  if (!page.title?.trim()) errors.push("Page title is required");
  if (!page.slug?.trim()) errors.push("Page slug is required");
  else if (!isValidSlug(page.slug)) {
    errors.push("Slug must be lowercase with hyphens only");
  }
  if (!Object.values(PAGE_STATUS).includes(page.status)) {
    errors.push("Invalid page status");
  }
  if (!Array.isArray(page.sections)) {
    errors.push("Page sections must be an array");
  } else {
    page.sections.forEach((section, i) => {
      if (!section.id) errors.push(`Section ${i + 1} missing ID`);
      if (!section.type) errors.push(`Section ${i + 1} missing type`);
      section.blocks?.forEach((block, j) => {
        const blockErrors = validateBlock(block);
        blockErrors.forEach((e) => errors.push(`Section ${i + 1}, block ${j + 1}: ${e}`));
      });
    });
  }
  return errors;
}

export function validateBlock(block) {
  const errors = [];
  if (!block.id) errors.push("Block missing ID");
  if (!block.type) errors.push("Block missing type");
  const def = getBlockDef(block.type);
  if (!def) {
    errors.push(`Unknown block type: ${block.type}`);
    return errors;
  }
  def.fields?.forEach((field) => {
    if (field.required && !block.content?.[field.key]?.toString()?.trim()) {
      errors.push(`${field.label} is required`);
    }
  });
  return errors;
}

export function validateForm(form) {
  const errors = [];
  if (!form.name?.trim()) errors.push("Form name is required");
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    errors.push("Form must have at least one field");
  }
  form.fields?.forEach((field, i) => {
    if (!field.id) errors.push(`Field ${i + 1} missing ID`);
    if (!field.type) errors.push(`Field ${i + 1} missing type`);
    if (!field.label?.trim()) errors.push(`Field ${i + 1} missing label`);
  });
  return errors;
}

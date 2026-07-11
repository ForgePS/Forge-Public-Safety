import { nanoid } from "nanoid";

export function createId(prefix = "id") {
  return `${prefix}_${nanoid(12)}`;
}

export function createPageId() {
  return createId("page");
}

export function createSectionId() {
  return createId("sec");
}

export function createBlockId() {
  return createId("blk");
}

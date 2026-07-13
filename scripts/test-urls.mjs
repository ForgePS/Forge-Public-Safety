import { normalizeHref, isExternalHref } from "../src/cms/core/urls.js";

const cases = [
  ["forgepublicsafety.com", "https://forgepublicsafety.com"],
  ["www.forgepublicsafety.com/contact", "https://www.forgepublicsafety.com/contact"],
  ["https://forgepublicsafety.com", "https://forgepublicsafety.com"],
  ["contact", "/contact"],
  ["/contact", "/contact"],
  ["mailto:demo@forgepublicsafety.com", "mailto:demo@forgepublicsafety.com"],
  ["#section", "#section"],
  ["", "/"],
  [null, "/"],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = normalizeHref(input);
  if (got !== expected) {
    console.error("FAIL", input, "=>", got, "expected", expected);
    failed++;
  }
}

if (isExternalHref("forgepublicsafety.com") !== true) {
  console.error("FAIL external domain detection");
  failed++;
}
if (isExternalHref("/contact") !== false) {
  console.error("FAIL internal path detection");
  failed++;
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("PASS", cases.length, "normalizeHref cases");

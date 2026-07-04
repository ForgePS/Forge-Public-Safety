#!/usr/bin/env node
/**
 * Scrape AFTA employee directory from sau.tech and write forge-academy/data/afta-staff.json
 *
 * Usage: node scripts/scrape-afta-staff.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(root, "data", "afta-staff.json");

/** @type {{ slug: string, name: string, jobTitle: string }[]} */
const STAFF = [
  { slug: "analls", name: "Ali Nalls", jobTitle: "Administrative Specialist I" },
  { slug: "amcdonald", name: "April McDonald", jobTitle: "Division Manager-EMS" },
  { slug: "droten", name: "Dillon Roten", jobTitle: "Facilities Technician" },
  { slug: "dcovington", name: "Donald Covington", jobTitle: "Fiscal Support Analyst" },
  { slug: "edaniell", name: "Edwina Daniell", jobTitle: "Administrative Specialist III-Testing" },
  { slug: "ezakin", name: "Emory Zakin", jobTitle: "AFTA Instructor" },
  { slug: "gwarner", name: "Grant Warner", jobTitle: "Director and Associate Vice Chancellor" },
  { slug: "jcovington", name: "Janet Covington", jobTitle: "Division Manager-Administration" },
  { slug: "jharper", name: "Jeremy Harper", jobTitle: "AFTA Instructor" },
  { slug: "jbaker", name: "Jessica Baker", jobTitle: "Administrative Specialist" },
  { slug: "khargiss", name: "Kilatha Hargiss", jobTitle: "Division Manager-FIRE" },
  { slug: "lfoster", name: "Leo Foster", jobTitle: "Regional Instructor" },
  { slug: "pmadayag", name: "Philip Madayag", jobTitle: "AFTA Instructor" },
  { slug: "ringram", name: "Rob Ingram", jobTitle: "AFTA Instructor" },
  { slug: "rgrant", name: "Ronnodo Grant", jobTitle: "Institutional Services Assistant" },
  { slug: "szakin", name: "Savannah Zakin", jobTitle: "Administrative Specialist" },
  { slug: "sfleming", name: "Shannon Fleming", jobTitle: "Division Manager-Certification" },
  { slug: "kreid", name: "Kelly Reid", jobTitle: "Deputy Director" },
];

function normalizePhone(raw) {
  const text = String(raw ?? "").trim();
  const extMatch = text.match(/(?:ext|x)\.?\s*(\d+)/i);
  const extension = extMatch ? extMatch[1] : "";
  let digits = text.replace(/(?:ext|x)\.?\s*\d+/i, "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  let phone = "";
  if (digits.length === 10 && digits.startsWith("870")) {
    phone = `870-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 7) {
    phone = `870-${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else if (digits.length === 10) {
    phone = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return { phone, phoneExtension: extension };
}

function extractPhoto(html, name) {
  const last = name.split(" ").pop() ?? "";
  const first = name.split(" ")[0] ?? "";
  const candidates = [
    ...html.matchAll(
      /https:\/\/lirp\.cdn-website\.com\/98cd28ae\/dms3rep\/multi\/opt\/[^"'\\)\s]+\.(jpg|jpeg|png|webp)/gi,
    ),
  ]
    .map((match) => match[0])
    .filter(
      (url) =>
        !/SAUTwhitelogo|Fire-Academy-|Official-Copy|Workforce|Environmental|HSPA|High\+Learning|SAU\+SYSTEM|texture|BIRD\+EYE|\.v2\./i.test(
          url,
        ),
    );
  const personal = candidates.find(
    (url) =>
      url.toLowerCase().includes(last.toLowerCase()) ||
      url.toLowerCase().includes(first.toLowerCase()),
  );
  return personal ?? "";
}

function inferRole(jobTitle) {
  const title = jobTitle.toLowerCase();
  if (title.includes("deputy director") || title.includes("director and associate vice chancellor")) {
    return "super_admin";
  }
  if (title.includes("division manager-certification")) return "certification_officer";
  if (title.includes("instructor") || title.includes("regional instructor")) return "instructor";
  return "academy_admin";
}

async function scrapeOne(base) {
  const profileUrl = `https://www.sautech.edu/individual-staff/${base.slug}`;
  const response = await fetch(profileUrl);
  const html = await response.text();
  const emailMatch = [...html.matchAll(/([a-z0-9._%+-]+@sautech\.edu)/gi)].map((m) => m[1].toLowerCase())[0];
  const email = emailMatch || "";
  const phoneBlock = html.match(/Phone:\s*([^<\n]+)/i)?.[1] ?? "";
  const phoneFallback = html.match(/870[-\s]?\d{3}[-\s]?\d{4}(?:\s*(?:ext|x)\.?\s*\d+)?/i)?.[0] ?? "";
  const { phone, phoneExtension } = normalizePhone(phoneBlock || phoneFallback);
  const role = inferRole(base.jobTitle);

  return {
    slug: base.slug,
    name: base.name,
    jobTitle: base.jobTitle,
    email: email || "",
    phone,
    phoneExtension,
    photoUrl: extractPhoto(html, base.name),
    profileUrl,
    organizationUnit: "Arkansas Fire Training Academy",
    role,
    createInstructorProfile: role === "instructor",
  };
}

const staff = [];
for (const person of STAFF) {
  staff.push(await scrapeOne(person));
  await new Promise((resolve) => setTimeout(resolve, 150));
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify({ scrapedAt: new Date().toISOString(), staff }, null, 2)}\n`);
console.log(`Wrote ${staff.length} staff records to ${outputPath}`);

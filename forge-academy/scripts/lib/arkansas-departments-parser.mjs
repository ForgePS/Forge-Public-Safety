const SOURCE_URL = "https://www.responserack.com/nfirs/department/arkansas/";

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTableRows(tableHtml) {
  return [...tableHtml.matchAll(/<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)]
    .map((row) => ({
      col1: stripHtml(row[1]),
      col2: stripHtml(row[2]),
      fdid: stripHtml(row[3]),
    }))
    .filter((row) => row.col1 && row.fdid && row.col1 !== "Fire Department");
}

/**
 * @param {string} html
 * @returns {Map<string, { name: string, fdid: string, county: string, departmentType: string }>}
 */
export function parseArkansasDepartmentsHtml(html) {
  /** @type {Map<string, { name: string, fdid: string, county: string, departmentType: string }>} */
  const byFdid = new Map();

  function upsert(entry) {
    const existing = byFdid.get(entry.fdid) ?? {
      name: "",
      fdid: entry.fdid,
      county: "",
      departmentType: "",
    };

    if (entry.name) existing.name = entry.name;
    if (entry.county) existing.county = entry.county;
    if (entry.departmentType) existing.departmentType = entry.departmentType;
    byFdid.set(entry.fdid, existing);
  }

  const countySections = html.split(/<h5[^>]*>/i);
  for (const section of countySections) {
    const countyMatch = section.match(/^([^<]+?) County Fire Departments/i);
    if (!countyMatch) continue;

    const county = countyMatch[1].trim();
    const tableMatch = section.match(/<table[\s\S]*?<\/table>/i);
    if (!tableMatch) continue;

    for (const row of parseTableRows(tableMatch[0])) {
      upsert({
        fdid: row.fdid,
        name: row.col1,
        county,
        departmentType: row.col2,
      });
    }
  }

  const nameTables = [
    ...html.matchAll(/<table class="table table-striped table-bordered">[\s\S]*?<\/table>/gi),
  ];
  for (const match of nameTables) {
    const table = match[0];
    if (!table.includes("County") || table.includes("Type")) continue;

    for (const row of parseTableRows(table)) {
      upsert({
        fdid: row.fdid,
        name: row.col1,
        county: row.col2,
        departmentType: "",
      });
    }
  }

  return byFdid;
}

export async function fetchArkansasDepartments() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Arkansas FDID list: ${response.status}`);
  }

  const html = await response.text();
  const byFdid = parseArkansasDepartmentsHtml(html);
  return [...byFdid.values()].sort((a, b) => a.name.localeCompare(b.name));
}

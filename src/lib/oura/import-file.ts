import { unzipSync, strFromU8 } from "fflate";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EXPANDED = 30 * 1024 * 1024;
type Row = Record<string, string | number | null | Record<string, never>> & {
  day: string;
};
export type OuraImport = {
  version: 1;
  importedAt: string;
  days: number;
  firstDay: string;
  lastDay: string;
  collections: Record<string, Row[]>;
  warnings: string[];
};
const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** RFC-style quoted fields, including escaped quotes and embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = first.includes(";") && !first.includes(",") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === '"' && !field && !closed) quoted = true;
    else if (char === delimiter || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (char !== delimiter) {
        if (row.some((cell) => cell.trim())) rows.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed || char === '"')
        throw new Error(
          "Invalid CSV quoting. Export the file again from Oura.",
        );
      field += char;
    }
    if (rows.length > 100_000 || field.length > 100_000)
      throw new Error("This file is too large to import.");
  }
  if (quoted) throw new Error("The CSV ends inside a quoted field.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
// Values use Oura export units: durations in seconds, distance in metres.
const fields: Record<string, Record<string, string[]>> = {
  daily_sleep: { score: ["Sleep Score"] },
  daily_readiness: {
    score: ["Readiness Score"],
    temperature_deviation: [
      "Temperature Deviation",
      "Temperature Deviation (°C)",
    ],
    temperature_trend_deviation: ["Temperature Trend Deviation"],
  },
  daily_activity: {
    score: ["Activity Score"],
    steps: ["Steps"],
    active_calories: ["Activity Burn"],
    total_calories: ["Total Burn"],
    target_calories: [],
    sedentary_time: ["Inactive Time"],
    resting_time: ["Rest Time"],
    non_wear_time: ["Non-wear Time"],
    average_met_minutes: ["Average MET"],
    equivalent_walking_distance: ["Equivalent Walking Distance"],
    high_activity_time: ["High Activity Time"],
    medium_activity_time: ["Medium Activity Time"],
    low_activity_time: ["Low Activity Time"],
  },
  sleep: {
    total_sleep_duration: ["Total Sleep Duration"],
    deep_sleep_duration: ["Deep Sleep Duration"],
    light_sleep_duration: ["Light Sleep Duration"],
    rem_sleep_duration: ["REM Sleep Duration"],
    awake_time: ["Awake Time"],
    latency: ["Sleep Latency"],
    efficiency: ["Sleep Efficiency"],
    time_in_bed: ["Total Bedtime"],
    average_heart_rate: ["Average Resting Heart Rate"],
    lowest_heart_rate: ["Lowest Resting Heart Rate"],
    average_hrv: ["Average HRV"],
    average_breath: ["Respiratory Rate"],
  },
};
function date(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseOuraFiles(
  files: { name: string; text: string }[],
): OuraImport {
  const collections: Record<string, Row[]> = Object.fromEntries(
    Object.keys(fields).map((key) => [key, []]),
  );
  const warnings: string[] = [];
  const days = new Set<string>();
  for (const file of files) {
    const csv = parseCsv(file.text.replace(/^\uFEFF/, ""));
    if (csv.length < 2) continue;
    const headers = csv[0].map(normalize);
    if (new Set(headers).size !== headers.length)
      throw new Error("Duplicate CSV columns. Export the file again.");
    const dayIndex = headers.findIndex(
      (h) => h === "day" || h === "date" || h === "summarydate",
    );
    if (dayIndex < 0) {
      warnings.push("A file without daily dates was skipped.");
      continue;
    }
    const stem = normalize(
      file.name
        .split("/")
        .at(-1)!
        .replace(/\.csv$/i, ""),
    );
    let used = false;
    for (const [endpoint, definitions] of Object.entries(fields)) {
      const own =
        stem === normalize(endpoint) ||
        (endpoint === "sleep" && stem === "sleepperiods");
      const mapping = Object.entries(definitions).map(([key, aliases]) => ({
        key,
        index: headers.findIndex((header) =>
          [...aliases, ...(own ? [key] : [])].some(
            (alias) => normalize(alias) === header,
          ),
        ),
      }));
      if (!mapping.some((field) => field.index >= 0)) continue;
      used = true;
      for (const cells of csv.slice(1)) {
        if (cells.length !== headers.length)
          throw new Error(
            "A CSV row has a different number of columns. Export it again.",
          );
        const day = cells[dayIndex].trim();
        if (
          !date(day) ||
          day < "2013-01-01" ||
          day > new Date().toISOString().slice(0, 10)
        )
          throw new Error("A record has an invalid or future date.");
        const record: Row = {
          id: `import-${endpoint}-${day}`,
          day,
          contributors: {},
          timestamp: `${day}T00:00:00Z`,
        };
        let populated = false;
        for (const { key, index } of mapping) {
          const raw = index < 0 ? "" : cells[index].trim();
          let value: number | null = null;
          if (raw && !/^(null|none|nan|n\/a)$/i.test(raw)) {
            value = Number(raw);
            if (
              !Number.isFinite(value) ||
              Math.abs(value) > 1e8 ||
              (key === "score" && (value < 0 || value > 100)) ||
              (!key.startsWith("temperature") && value < 0)
            )
              throw new Error(
                `Invalid numeric value in ${key.replaceAll("_", " ")}.`,
              );
            populated = true;
          }
          record[key] = value;
        }
        if (!populated) continue;
        if (endpoint === "sleep") {
          record.period = 0;
          record.type = "long_sleep";
          for (const key of ["bedtime_start", "bedtime_end"]) {
            const index = headers.indexOf(normalize(key));
            const value = index >= 0 ? cells[index].trim() : "";
            record[key] = Number.isFinite(Date.parse(value)) ? value : "";
          }
          record.sleep_phase_5_min = null;
        }
        collections[endpoint].push(record);
        days.add(day);
      }
    }
    if (!used)
      warnings.push(
        "A file without supported sleep, readiness or activity columns was skipped.",
      );
  }
  if (!days.size)
    throw new Error(
      "No supported daily records found. Choose an Oura daily CSV or a ZIP containing daily CSV files.",
    );
  // Daily summaries must be unambiguous. Sleep periods are retained; charts choose the longest.
  for (const [endpoint, records] of Object.entries(collections)) {
    const merged = new Map<string, Row>();
    for (const record of records) {
      const key =
        endpoint === "sleep"
          ? `${record.day}:${record.bedtime_start}:${record.total_sleep_duration}`
          : record.day;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, record);
        continue;
      }
      for (const field of Object.keys(fields[endpoint])) {
        if (
          existing[field] != null &&
          record[field] != null &&
          existing[field] !== record[field]
        )
          throw new Error(
            "Conflicting records for the same day. Import one consistent export.",
          );
        if (record[field] != null) existing[field] = record[field];
      }
    }
    collections[endpoint] = [...merged.values()].sort((a, b) =>
      a.day.localeCompare(b.day),
    );
  }
  const sorted = [...days].sort();
  return {
    version: 1,
    importedAt: new Date().toISOString(),
    days: days.size,
    firstDay: sorted[0],
    lastDay: sorted.at(-1)!,
    collections,
    warnings: [...new Set(warnings)],
  };
}
export function readOuraFile(name: string, bytes: Uint8Array): OuraImport {
  if (bytes.length > MAX_BYTES)
    throw new Error("Choose a file smaller than 10 MB.");
  if (/\.csv$/i.test(name))
    return parseOuraFiles([{ name, text: strFromU8(bytes) }]);
  if (!/\.zip$/i.test(name)) throw new Error("Choose a CSV or ZIP file.");
  let total = 0,
    count = 0;
  try {
    const files = unzipSync(bytes, {
      filter(entry) {
        if (++count > 500) throw new Error("Too many files in ZIP.");
        if (!/\.csv$/i.test(entry.name) || entry.name.startsWith("__MACOSX/"))
          return false;
        total += entry.originalSize;
        if (total > MAX_EXPANDED) throw new Error("Expanded ZIP is too large.");
        return true;
      },
    });
    return parseOuraFiles(
      Object.entries(files).map(([name, bytes]) => ({
        name,
        text: strFromU8(bytes),
      })),
    );
  } catch (error) {
    if (error instanceof Error && !("code" in error)) throw error;
    throw new Error(
      "This ZIP could not be read. Choose an unencrypted Oura export.",
    );
  }
}

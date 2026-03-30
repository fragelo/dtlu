export interface LogRecord {
  content: string;
  timestamp?: string;
  severity?: string;
  [key: string]: string | undefined;
}

export interface ParseResult {
  records: LogRecord[];
  headers: string[];
  rowCount: number;
  skippedRows: number;
  warnings: string[];
}

const TIMESTAMP_KEYS = ["timestamp", "@timestamp", "_timestamp", "eventtime", "date", "published_date"];
const SEVERITY_KEYS = ["severity", "loglevel", "level", "status"];

function findKey(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(h.toLowerCase()));
}

function normalizeTimestamp(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
  const epoch = Number(raw);
  if (!isNaN(epoch) && epoch > 1_000_000_000_000) return new Date(epoch).toISOString();
  if (!isNaN(epoch) && epoch > 1_000_000_000) return new Date(epoch * 1000).toISOString();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString();
  return undefined;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else { current += ch; }
  }
  result.push(current);
  return result;
}

function resolveTimestampKey(headers: string[], hint?: string): string | undefined {
  if (!hint) return findKey(headers, TIMESTAMP_KEYS);
  const num = parseInt(hint, 10);
  if (!isNaN(num) && num >= 1 && num <= headers.length) return headers[num - 1];
  return headers.find(h => h.toLowerCase() === hint.toLowerCase());
}

export function parseCSV(csvText: string, timestampHint?: string): ParseResult {
  const warnings: string[] = [];
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return { records: [], headers: [], rowCount: 0, skippedRows: 0, warnings: ["File is empty or has no data rows."] };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  if (headers.length === 0) return { records: [], headers: [], rowCount: 0, skippedRows: 0, warnings: ["No headers found."] };
  const tsKey = resolveTimestampKey(headers, timestampHint);
  const severityKey = findKey(headers, SEVERITY_KEYS);
  if (timestampHint && !tsKey) warnings.push(`Timestamp column "${timestampHint}" not found. Ingestion time will be used.`);
  const records: LogRecord[] = [];
  let skippedRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvLine(line);
    if (values.length !== headers.length) {
      skippedRows++;
      if (skippedRows <= 5) warnings.push(`Row ${i + 1} has ${values.length} fields but expected ${headers.length}. Skipped.`);
      continue;
    }
    const record: LogRecord = { content: line };
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() ?? "";
      const lowerHeader = header.toLowerCase();
      if (tsKey && lowerHeader === tsKey.toLowerCase()) {
        const normalized = normalizeTimestamp(value);
        if (normalized) record.timestamp = normalized;
        else if (value) record.timestamp = value;
      } else if (severityKey && lowerHeader === severityKey.toLowerCase()) {
        if (value) record.severity = value;
      } else {
        if (value) record[header] = value;
      }
    });
    records.push(record);
  }
  return { records, headers, rowCount: records.length, skippedRows, warnings };
}

export function parseRawText(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const records: LogRecord[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    records.push({ content: trimmed });
  }
  return { records, headers: [], rowCount: records.length, skippedRows: 0, warnings: records.length === 0 ? ["No lines found."] : [] };
}

export function chunkRecords(records: LogRecord[], size = 1000): LogRecord[][] {
  const chunks: LogRecord[][] = [];
  for (let i = 0; i < records.length; i += size) chunks.push(records.slice(i, i + size));
  return chunks;
}

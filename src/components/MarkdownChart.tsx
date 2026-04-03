import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { BOSCH_CHART_COLORS } from "@/lib/bosch-colors";

const COLORS = BOSCH_CHART_COLORS;

interface ChartData {
  type: "bar" | "stacked-bar";
  title?: string;
  data: Record<string, string | number>[];
  keys: string[];
  nameKey: string;
}

/**
 * Try to parse a code-block string as a chart-friendly ASCII table.
 * Returns null if the text doesn't look like chart data.
 */
export function parseChartData(text: string): ChartData | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // Find header row and separator row
  let headerIdx = -1;
  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("|") && /^[|\s\-:]+$/.test(lines[i])) {
      sepIdx = i;
      headerIdx = i - 1;
      break;
    }
  }

  // If no separator, try first-line-is-header pattern: "Col | Col"
  if (sepIdx === -1) {
    // Look for lines with "|" that have text columns
    const pipeLines = lines.filter((l) => l.includes("|") && !/^\*/.test(l));
    if (pipeLines.length < 2) return null;
    headerIdx = lines.indexOf(pipeLines[0]);
    // Check if next pipe line is a separator
    const nextPipe = pipeLines[1];
    if (/^[|\s\-:]+$/.test(nextPipe)) {
      sepIdx = lines.indexOf(nextPipe);
    } else {
      // No separator: treat first pipe-line as header, rest as data
      sepIdx = -1; // will skip sep below
    }
  }

  if (headerIdx < 0) return null;

  const splitRow = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

  const headers = splitRow(lines[headerIdx]);
  if (headers.length < 2) return null;

  const dataStartIdx = sepIdx >= 0 ? sepIdx + 1 : headerIdx + 1;
  const dataRows: Record<string, string | number>[] = [];

  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;
    if (/^[|\s\-:]+$/.test(line)) continue; // skip extra separators
    if (/^\*/.test(line)) continue; // skip footnotes
    const cols = splitRow(line);
    if (cols.length < headers.length) continue;

    const row: Record<string, string | number> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = cols[j] ?? "";
      const num = Number(val);
      row[headers[j]] = isNaN(num) ? val : num;
    }
    dataRows.push(row);
  }

  if (dataRows.length === 0) return null;

  // Determine chart type based on headers
  const valueKeys = headers.slice(1);
  const hasNumericValues = dataRows.some((row) =>
    valueKeys.some((k) => typeof row[k] === "number")
  );

  if (!hasNumericValues) return null;

  const numericKeys = valueKeys.filter((k) =>
    dataRows.some((row) => typeof row[k] === "number")
  );

  let type: ChartData["type"] = "bar";
  if (numericKeys.length > 1) {
    type = "stacked-bar";
  }

  return {
    type,
    data: dataRows,
    keys: numericKeys,
    nameKey: headers[0],
  };
}

interface MarkdownChartProps {
  text: string;
}

export default function MarkdownChart({ text }: MarkdownChartProps) {
  const chart = parseChartData(text);
  if (!chart) return null;

  const { type, data, keys, nameKey } = chart;

  // Bar or Stacked Bar
  return (
    <div className="my-4 rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {keys.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 11 }} />
          )}
          {keys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={type === "stacked-bar" ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

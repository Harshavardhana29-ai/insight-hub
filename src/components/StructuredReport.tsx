import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BOSCH_CHART_COLORS, BOSCH_PIE_COLORS } from "@/lib/bosch-colors";

// ── Colors ──────────────────────────────────────────────────────
const COLORS = BOSCH_CHART_COLORS;
const PIE_COLORS = BOSCH_PIE_COLORS;

// ── Types ───────────────────────────────────────────────────────
interface TextSection { 
  type: "text";
  title?: string;
  content: string;
}

interface ChartSection {
  type: "chart";
  title?: string;
  chartType?: "bar" | "line" | "pie";
  data: Record<string, string | number>[];
  keys: string[];
  nameKey: string;
}

interface TableSection {
  type: "table";
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

export type ReportSection = TextSection | ChartSection | TableSection;

export interface StructuredReportData {
  sections: ReportSection[];
}

// ── Parsing ─────────────────────────────────────────────────────

/**
 * Try to parse text as a structured JSON report.
 * Returns parsed data if valid, null otherwise.
 */
export function parseStructuredReport(text: string): StructuredReportData | null {
  if (!text) return null;

  let cleaned = text.trim();

  // Strip markdown JSON fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }

  // Find the first { and last } to extract JSON even with surrounding text
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  try {
    const parsed = JSON.parse(cleaned.substring(first, last + 1));
    if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      // Validate every section has a recognized type
      const valid = parsed.sections.every(
        (s: { type?: string }) => s.type === "text" || s.type === "chart" || s.type === "table"
      );
      if (valid) return parsed as StructuredReportData;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

// ── Chart axis/tooltip styles ───────────────────────────────────
const axisTickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const axisLineStyle = { stroke: "hsl(var(--border))" };
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// ── Sub-renderers ───────────────────────────────────────────────

/** Custom ReactMarkdown components — styled to match the PDF export format */
const textComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-foreground mt-5 mb-2 pb-1.5 border-b-2 border-primary">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-primary mt-4 mb-1.5 pb-1 border-b border-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-foreground mt-3.5 mb-1">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-bold text-muted-foreground mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground my-1">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 pl-5 list-disc space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 pl-5 list-decimal space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground pl-0.5">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-primary pl-3.5 py-1.5 my-2.5 bg-muted/50 rounded-r-md text-muted-foreground italic text-sm">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-t border-border my-3" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-muted border border-border rounded-md p-3 overflow-x-auto my-2">
          <code className="text-xs font-mono text-foreground">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm border-b border-border">{children}</td>
  ),
};

function TextBlock({ section }: { section: TextSection }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={textComponents}>
        {section.content}
      </ReactMarkdown>
    </div>
  );
}

function ChartBlock({ section }: { section: ChartSection }) {
  const chartType = section.chartType || "bar";
  const { data, keys, nameKey } = section;

  return (
    <div className="my-2 rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={280}>
        {chartType === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey={keys[0]}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : chartType === "line" ? (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function TableBlock({ section }: { section: TableSection }) {
  return (
    <div className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted">
          <tr>
            {section.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-muted/50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-sm">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

interface StructuredReportProps {
  data: StructuredReportData;
}

export default function StructuredReport({ data }: StructuredReportProps) {
  return (
    <div className="space-y-4">
      {data.sections.map((section, idx) => (
        <div key={idx}>
          {section.title && (
            <h3 className="text-base font-semibold text-primary mt-4 mb-1">{section.title}</h3>
          )}
          {section.type === "text" && <TextBlock section={section as TextSection} />}
          {section.type === "chart" && <ChartBlock section={section as ChartSection} />}
          {section.type === "table" && <TableBlock section={section as TableSection} />}
        </div>
      ))}
    </div>
  );
}

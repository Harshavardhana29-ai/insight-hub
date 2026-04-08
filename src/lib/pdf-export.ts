/**
 * Shared PDF & Word export utilities.
 *
 * Uses html2canvas to render markdown as pixel-perfect styled HTML,
 * then paginates the captured canvas into a jsPDF document with a
 * professionally designed cover page.
 */

import { parseChartData } from "@/components/MarkdownChart";
import { parseStructuredReport, type StructuredReportData, type ReportSection } from "@/components/StructuredReport";
import {
  BOSCH_CHART_COLORS, BOSCH_PIE_COLORS, exportColors,
  boschBlue, boschGray, hexToRgb,
} from "@/lib/bosch-colors";

// ── Public types ────────────────────────────────────────────────
export interface ExportOptions {
  reportMarkdown: string;
  title: string;
  agentNames: string;
  topic?: string;
  dataSources?: string[];
}

// ── Helpers ─────────────────────────────────────────────────────

/** Format current time as "March 25, 2026 at 02:45 PM" */
export function formatTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) +
    " at " +
    now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

/** Load an image from URL as base64 data-URL, returning natural dimensions */
async function loadImageInfo(
  url: string,
): Promise<{ dataUrl: string; w: number; h: number; img: HTMLImageElement } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")?.drawImage(img, 0, 0);
      resolve({
        dataUrl: c.toDataURL("image/png"),
        w: img.naturalWidth,
        h: img.naturalHeight,
        img,
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Chart data → styled HTML table (reuses same parsing as MarkdownChart) ──

const CHART_COLORS = [...BOSCH_CHART_COLORS];

/** Safely convert a value to number (handles string-typed numbers from JSON) */
function toNum(v: string | number | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}

/**
 * Convert parsed chart data into a professional HTML data table +
 * horizontal bar chart for PDF/Word.
 * Uses single-table layout with bgcolor attribute for Word compatibility.
 */
function chartDataToHtmlTable(
  chart: { type: string; data: Record<string, string | number>[]; keys: string[]; nameKey: string },
): string {
  const { data, keys, nameKey } = chart;
  const allHeaders = [nameKey, ...keys];

  // ── Data Table ──
  let html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
  html += "<thead><tr>";
  allHeaders.forEach((h) => {
    html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;">${h}</th>`;
  });
  html += "</tr></thead><tbody>";

  data.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "#ffffff" : exportColors.tableRowAlt;
    html += `<tr bgcolor="${bg}" style="background-color:${bg};">`;
    allHeaders.forEach((h) => {
      html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;">${row[h] ?? ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";

  // ── Horizontal Bar Chart ──
  if (keys.length >= 1) {
    const maxVal = Math.max(
      ...data.flatMap((row) => keys.map((k) => toNum(row[k]))),
      1,
    );

    // Legend (if multiple series)
    if (keys.length > 1) {
      html += `<p style="margin:10px 0 4px 0;font-size:8pt;color:${exportColors.textMuted};">`;
      keys.forEach((k, ki) => {
        const color = CHART_COLORS[ki % CHART_COLORS.length];
        html += `<span style="display:inline-block;width:10px;height:10px;background-color:${color};vertical-align:middle;margin-right:4px;"></span>`;
        html += `<span style="margin-right:14px;">${k}</span>`;
      });
      html += '</p>';
    }

    // Bar rows — single flat table with colored cells as bars (no nested table)
    html += '<table style="border-collapse:collapse;width:100%;margin:6px 0 14px 0;">';
    data.forEach((row) => {
      const label = String(row[nameKey] ?? "");

      keys.forEach((k, ki) => {
        const val = toNum(row[k]);
        const pct = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 3 : 0);
        const color = CHART_COLORS[ki % CHART_COLORS.length];
        const showLabel = ki === 0;
        const barH = keys.length > 1 ? 14 : 20;
        const vPad = keys.length > 1 ? 1 : 4;

        html += '<tr>';
        // Label column
        html += `<td style="width:130px;padding:${vPad}px 8px ${vPad}px 0;font-size:8.5pt;color:${exportColors.text};white-space:nowrap;vertical-align:middle;">`;
        html += showLabel ? label : '';
        html += '</td>';
        // Bar cell — single cell with bgcolor for Word compatibility
        html += `<td style="padding:${vPad}px 0;vertical-align:middle;">`;
        if (pct > 0) {
          html += `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:${pct}%;"><tr>`;
          html += `<td bgcolor="${color}" style="background-color:${color};height:${barH}px;font-size:1px;line-height:1px;">&nbsp;</td>`;
          html += '</tr></table>';
        }
        html += '</td>';
        // Value column
        html += `<td style="width:50px;padding:${vPad}px 0 ${vPad}px 8px;font-size:8pt;color:${exportColors.textMuted};text-align:right;vertical-align:middle;white-space:nowrap;">`;
        html += `${val}`;
        html += '</td>';
        html += '</tr>';
      });

      if (keys.length > 1) {
        html += '<tr><td colspan="3" style="height:6px;font-size:1px;line-height:1px;">&nbsp;</td></tr>';
      }
    });
    html += '</table>';
  }

  return html;
}

/**
 * Convert pie chart data to an HTML table with colored indicators + percentage column.
 * Since pie charts can't be rendered as bars, we show a styled table with color swatches.
 */
function pieChartToHtmlTable(
  chart: { data: Record<string, string | number>[]; keys: string[]; nameKey: string },
): string {
  const { data, keys, nameKey } = chart;
  const valueKey = keys[0] || "value";
  const total = data.reduce((sum, row) => sum + toNum(row[valueKey]), 0) || 1;

  let html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
  html += '<thead><tr>';
  html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;width:30px;"></th>`;
  html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;">${nameKey}</th>`;
  html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:right;font-weight:700;font-size:8.5pt;">${valueKey}</th>`;
  html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:right;font-weight:700;font-size:8.5pt;">Share</th>`;
  html += '</tr></thead><tbody>';

  data.forEach((row, ri) => {
    const color = CHART_COLORS[ri % CHART_COLORS.length];
    const val = toNum(row[valueKey]);
    const pct = ((val / total) * 100).toFixed(1);
    const bg = ri % 2 === 0 ? "#ffffff" : exportColors.tableRowAlt;
    html += `<tr bgcolor="${bg}" style="background-color:${bg};">`;
    // Color swatch
    html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};text-align:center;">`;
    html += `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 auto;"><tr>`;
    html += `<td bgcolor="${color}" style="background-color:${color};width:14px;height:14px;font-size:1px;">&nbsp;</td>`;
    html += `</tr></table></td>`;
    // Label
    html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;">${row[nameKey] ?? ""}</td>`;
    // Value
    html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;text-align:right;">${val}</td>`;
    // Percentage bar + text
    html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;text-align:right;">`;
    html += `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;"><tr>`;
    const barPct = Math.max(Math.round(parseFloat(pct)), 2);
    html += `<td bgcolor="${color}" style="background-color:${color};width:${barPct}%;height:10px;font-size:1px;line-height:1px;">&nbsp;</td>`;
    if (barPct < 100) html += `<td style="width:${100-barPct}%;"></td>`;
    html += `</tr></table>`;
    html += `<span style="font-size:8pt;color:${exportColors.textMuted};">${pct}%</span>`;
    html += `</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

// ── Markdown → styled HTML (used by html2canvas) ───────────────

function mdToHtml(md: string): string {
  let src = md.replace(/\r\n/g, "\n");

  // 1) Fenced code blocks → <pre> OR chart table if data is chart-like
  src = src.replace(/```\w*\n([\s\S]*?)```/g, (_, code: string) => {
    // Use the same parseChartData logic as the browser MarkdownChart component
    const chartData = parseChartData(code.trim());
    if (chartData) {
      return `\n${chartDataToHtmlTable(chartData)}\n`;
    }
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `\n%%PRE%%<pre style="background:${exportColors.codeBg};border:1px solid ${exportColors.codeBorder};border-radius:5px;padding:12px 14px;font-family:Consolas,'Courier New',monospace;font-size:8.5pt;line-height:1.5;white-space:pre-wrap;margin:8px 0;"><code>${escaped}</code></pre>%%/PRE%%\n`;
  });

  // 2) Inline formatting
  src = src.replace(
    /`([^`]+)`/g,
    `<code style="background:${exportColors.inlineCodeBg};padding:1px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:8.5pt;">$1</code>`,
  );
  src = src.replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>");
  src = src.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  src = src.replace(/\*([^\n*]+)\*/g, "<i>$1</i>");
  src = src.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" style="color:${exportColors.link};text-decoration:underline;">$1</a>`,
  );

  // 3) Process line-by-line for block elements
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    // Pre-block pass-through
    if (t.startsWith("%%PRE%%")) {
      closeList();
      let block = t.replace("%%PRE%%", "");
      if (!t.includes("%%/PRE%%")) {
        while (++i < lines.length && !lines[i].includes("%%/PRE%%")) {
          block += "\n" + lines[i];
        }
        if (i < lines.length) block += "\n" + lines[i];
      }
      out.push(block.replace("%%/PRE%%", ""));
      i++;
      continue;
    }

    // ── Headings (check longer prefixes first) ──
    if (/^####\s+/.test(t)) {
      closeList();
      out.push(
        `<h4 style="font-size:10.5pt;color:${exportColors.text};font-weight:700;margin:12px 0 4px;">${t.replace(/^####\s+/, "")}</h4>`,
      );
      i++; continue;
    }
    if (/^###\s+/.test(t) && !/^####/.test(t)) {
      closeList();
      out.push(
        `<h3 style="font-size:11.5pt;color:${exportColors.text};font-weight:700;margin:14px 0 5px;">${t.replace(/^###\s+/, "")}</h3>`,
      );
      i++; continue;
    }
    if (/^##\s+/.test(t) && !/^###/.test(t)) {
      closeList();
      out.push(
        `<h2 style="font-size:13pt;color:${exportColors.heading};font-weight:700;margin:18px 0 6px;padding-bottom:3px;border-bottom:1.5px solid ${exportColors.heading};">${t.replace(/^##\s+/, "")}</h2>`,
      );
      i++; continue;
    }
    if (/^#\s+/.test(t) && !/^##/.test(t)) {
      closeList();
      out.push(
        `<h1 style="font-size:16pt;color:${exportColors.headingDark};font-weight:700;margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid ${exportColors.heading};">${t.replace(/^#\s+/, "")}</h1>`,
      );
      i++; continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}$/.test(t)) {
      closeList();
      out.push(`<hr style="border:none;border-top:1px solid ${exportColors.separator};margin:12px 0;"/>`);  
      i++; continue;
    }

    // ── Table ──
    if (
      t.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[-:|\s]+\|$/.test((lines[i + 1] || "").trim())
    ) {
      closeList();
      const tl: string[] = [];
      while (i < lines.length && (lines[i] || "").trim().startsWith("|")) {
        tl.push((lines[i] || "").trim());
        i++;
      }
      const hdr = tl[0].replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const rows = tl.slice(2).filter((r) => !/^\|[-:|\s]+\|$/.test(r));

      let table =
        '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
      table += "<thead><tr>";
      hdr.forEach(
        (h) =>
          (table += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;">${h}</th>`),
      );
      table += "</tr></thead><tbody>";
      rows.forEach((row, ri) => {
        const cells = row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const bg = ri % 2 === 0 ? "#ffffff" : exportColors.tableRowAlt;
        table += `<tr bgcolor="${bg}" style="background-color:${bg};">`;
        cells.forEach(
          (c) =>
            (table += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;">${c}</td>`),
        );
        table += "</tr>";
      });
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    // ── Blockquote ──
    if (t.startsWith(">")) {
      closeList();
      const ql: string[] = [];
      while (i < lines.length && (lines[i] || "").trim().startsWith(">")) {
        ql.push((lines[i] || "").trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        `<blockquote style="border-left:3px solid ${exportColors.blockquoteBorder};padding:8px 14px;margin:10px 0;background:${exportColors.blockquoteBg};color:${exportColors.textMuted};font-style:italic;border-radius:0 4px 4px 0;">${ql.join("<br/>")}</blockquote>`,
      );
      continue;
    }

    // ── Bullet list ──
    const bm = raw.match(/^(\s*)([-*+])\s+(.*)/);
    if (bm) {
      if (!inUl) {
        closeList();
        out.push('<ul style="margin:5px 0;padding-left:18px;list-style:disc;">');
        inUl = true;
      }
      const ml =
        (bm[1]?.length || 0) > 1
          ? ` margin-left:${Math.floor((bm[1]?.length || 0) / 2) * 12}px;`
          : "";
      out.push(
        `<li style="margin-bottom:3px;line-height:1.55;font-size:10pt;${ml}">${bm[3]}</li>`,
      );
      i++; continue;
    }

    // ── Numbered list ──
    const nm = raw.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (nm) {
      if (!inOl) {
        closeList();
        out.push('<ol style="margin:5px 0;padding-left:18px;">');
        inOl = true;
      }
      const ml =
        (nm[1]?.length || 0) > 1
          ? ` margin-left:${Math.floor((nm[1]?.length || 0) / 2) * 12}px;`
          : "";
      out.push(
        `<li style="margin-bottom:3px;line-height:1.55;font-size:10pt;${ml}">${nm[3]}</li>`,
      );
      i++; continue;
    }

    // ── Empty line ──
    if (t === "") {
      const next = (lines[i + 1] || "").trim();
      if (
        (inUl || inOl) &&
        !next.match(/^[-*+]\s+/) &&
        !next.match(/^\d+\.\s+/)
      ) {
        closeList();
      }
      out.push('<div style="height:4px;"></div>');
      i++; continue;
    }

    // ── Paragraph ──
    closeList();
    out.push(
      `<p style="margin:4px 0;line-height:1.65;font-size:10pt;color:${exportColors.text};">${t}</p>`,
    );
    i++;
  }
  closeList();
  return out.join("\n");
}

// ── Structured JSON → styled HTML ──────────────────────────────

// ── Canvas-rendered chart images for export ─────────────────────
const EXP_W = 660, EXP_H = 320, EXP_SCALE = 2;
const EXP_PAD = { top: 24, right: 24, bottom: 52, left: 58 };

function createChartCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = EXP_W * EXP_SCALE;
  c.height = EXP_H * EXP_SCALE;
  const ctx = c.getContext("2d")!;
  ctx.scale(EXP_SCALE, EXP_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, EXP_W, EXP_H);
  return [c, ctx];
}

function niceStep(max: number, ticks: number): number {
  const rough = max / ticks;
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
}

function getMaxVal(data: Record<string, string | number>[], keys: string[]): number {
  let max = 0;
  for (const row of data) for (const k of keys) max = Math.max(max, toNum(row[k]));
  return max * 1.15 || 1;
}

function drawYGrid(
  ctx: CanvasRenderingContext2D,
  max: number, plotX: number, plotY: number, plotW: number, plotH: number,
): void {
  const step = niceStep(max, 5);
  ctx.strokeStyle = boschGray[90];
  ctx.lineWidth = 0.6;
  ctx.fillStyle = boschGray[55];
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; ; i++) {
    const val = i * step;
    if (val > max * 1.05) break;
    const y = plotY + plotH - (val / max) * plotH;
    ctx.beginPath(); ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y); ctx.stroke();
    ctx.fillText(val % 1 === 0 ? String(val) : val.toFixed(1), plotX - 7, y);
  }
  // Bottom axis
  ctx.strokeStyle = boschGray[85]; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
}

function drawChartLegend(ctx: CanvasRenderingContext2D, keys: string[]): void {
  ctx.font = "10px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  let totalW = 0;
  keys.forEach((k) => { totalW += 14 + ctx.measureText(k).width + 16; });
  let lx = (EXP_W - totalW) / 2;
  const ly = EXP_H - 12;
  keys.forEach((k, i) => {
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(lx, ly - 5, 10, 10);
    ctx.fillStyle = boschGray[50];
    ctx.fillText(k, lx + 14, ly);
    lx += 14 + ctx.measureText(k).width + 16;
  });
}

function drawXLabel(ctx: CanvasRenderingContext2D, label: string, x: number, baseY: number): void {
  ctx.fillStyle = boschGray[55]; ctx.font = "10px Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const display = label.length > 14 ? label.slice(0, 13) + "\u2026" : label;
  ctx.fillText(display, x, baseY + 8);
}

function renderBarChart(
  data: Record<string, string | number>[], keys: string[], nameKey: string,
): string {
  const [canvas, ctx] = createChartCanvas();
  const px = EXP_PAD.left, py = EXP_PAD.top;
  const pw = EXP_W - EXP_PAD.left - EXP_PAD.right;
  const ph = EXP_H - EXP_PAD.top - EXP_PAD.bottom;
  const max = getMaxVal(data, keys);
  drawYGrid(ctx, max, px, py, pw, ph);

  const grpW = pw / data.length;
  const nK = keys.length;
  const totalBarW = grpW * 0.7;
  const barW = totalBarW / nK;
  const gap = (grpW - totalBarW) / 2;

  data.forEach((row, i) => {
    keys.forEach((k, ki) => {
      const val = toNum(row[k]);
      const barH = (val / max) * ph;
      const x = px + i * grpW + gap + ki * barW;
      const y = py + ph - barH;
      ctx.fillStyle = CHART_COLORS[ki % CHART_COLORS.length];
      const r = Math.min(3, barW / 3);
      ctx.beginPath();
      ctx.moveTo(x, py + ph); ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, py + ph); ctx.closePath(); ctx.fill();
    });
    drawXLabel(ctx, String(row[nameKey] || ""), px + i * grpW + grpW / 2, py + ph);
  });
  if (nK > 1) drawChartLegend(ctx, keys);
  return canvas.toDataURL("image/png");
}

function renderLineChart(
  data: Record<string, string | number>[], keys: string[], nameKey: string,
): string {
  const [canvas, ctx] = createChartCanvas();
  const px = EXP_PAD.left, py = EXP_PAD.top;
  const pw = EXP_W - EXP_PAD.left - EXP_PAD.right;
  const ph = EXP_H - EXP_PAD.top - EXP_PAD.bottom;
  const max = getMaxVal(data, keys);
  drawYGrid(ctx, max, px, py, pw, ph);

  const n = data.length;
  const stepX = n > 1 ? pw / (n - 1) : 0;

  keys.forEach((k, ki) => {
    const color = CHART_COLORS[ki % CHART_COLORS.length];
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath();
    data.forEach((row, i) => {
      const val = toNum(row[k]);
      const x = px + (n > 1 ? i * stepX : pw / 2);
      const y = py + ph - (val / max) * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots
    ctx.fillStyle = color;
    data.forEach((row, i) => {
      const val = toNum(row[k]);
      const x = px + (n > 1 ? i * stepX : pw / 2);
      const y = py + ph - (val / max) * ph;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    });
  });

  data.forEach((row, i) => {
    const x = px + (n > 1 ? i * stepX : pw / 2);
    drawXLabel(ctx, String(row[nameKey] || ""), x, py + ph);
  });
  if (keys.length > 1) drawChartLegend(ctx, keys);
  return canvas.toDataURL("image/png");
}

function renderPieChart(
  data: Record<string, string | number>[], keys: string[], nameKey: string,
): string {
  const [canvas, ctx] = createChartCanvas();
  const valueKey = keys[0] || "value";
  const total = data.reduce((s, r) => s + toNum(r[valueKey]), 0) || 1;
  const cx = EXP_W * 0.36, cy = EXP_H / 2;
  const radius = Math.min(cx - 30, cy - 30);
  let angle = -Math.PI / 2;

  const slices: { start: number; end: number; color: string; label: string; pct: number }[] = [];
  data.forEach((row, i) => {
    const val = toNum(row[valueKey]);
    const pct = val / total;
    const sweep = pct * 2 * Math.PI;
    slices.push({ start: angle, end: angle + sweep, color: CHART_COLORS[i % CHART_COLORS.length], label: String(row[nameKey] || ""), pct: pct * 100 });
    angle += sweep;
  });

  // Slices
  slices.forEach((s) => {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, s.start, s.end); ctx.closePath();
    ctx.fillStyle = s.color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  });
  // Percent labels on slices
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  slices.forEach((s) => {
    if (s.pct < 5) return;
    const mid = (s.start + s.end) / 2;
    ctx.fillText(`${Math.round(s.pct)}%`, cx + Math.cos(mid) * radius * 0.65, cy + Math.sin(mid) * radius * 0.65);
  });
  // Legend on the right
  const legendX = EXP_W * 0.66;
  let ly = 30;
  ctx.font = "11px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  slices.forEach((s) => {
    ctx.fillStyle = s.color; ctx.fillRect(legendX, ly - 5, 12, 12);
    ctx.fillStyle = boschGray[30];
    const txt = s.label.length > 18 ? s.label.slice(0, 17) + "\u2026" : s.label;
    ctx.fillText(`${txt} (${s.pct.toFixed(1)}%)`, legendX + 18, ly + 1);
    ly += 22;
  });
  return canvas.toDataURL("image/png");
}

function renderChartImage(
  chartType: string, data: Record<string, string | number>[], keys: string[], nameKey: string,
): string {
  if (chartType === "pie") return renderPieChart(data, keys, nameKey);
  if (chartType === "line") return renderLineChart(data, keys, nameKey);
  return renderBarChart(data, keys, nameKey);
}

function structuredSectionToHtml(section: ReportSection): string {
  let html = "";

  if (section.title) {
    html += `<h2 style="font-size:13pt;color:${exportColors.heading};font-weight:700;margin:18px 0 6px;padding-bottom:3px;border-bottom:1.5px solid ${exportColors.heading};">${section.title}</h2>`;
  }

  if (section.type === "text") {
    // Convert markdown content to HTML using mdToHtml
    html += mdToHtml(section.content);
  } else if (section.type === "table") {
    html += '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
    html += "<thead><tr>";
    section.headers.forEach((h) => {
      html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;">${h}</th>`;
    });
    html += "</tr></thead><tbody>";
    section.rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? "#ffffff" : exportColors.tableRowAlt;
      html += `<tr bgcolor="${bg}" style="background-color:${bg};">`;
      row.forEach((cell) => {
        html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;">${cell}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
  } else if (section.type === "chart") {
    // Normalize data — ensure numeric values are actual numbers
    const normalizedData = section.data.map((row) => {
      const newRow: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(row)) {
        if (section.keys.includes(k)) {
          newRow[k] = toNum(v);
        } else {
          newRow[k] = v;
        }
      }
      return newRow;
    });

    const chartType = section.chartType || "bar";
    // Render actual chart as canvas image — matches the chat UI appearance
    const imgDataUrl = renderChartImage(chartType, normalizedData, section.keys, section.nameKey);
    html += `<div style="margin:10px 0;text-align:center;"><img src="${imgDataUrl}" style="width:100%;max-width:660px;height:auto;" /></div>`;
  }

  return html;
}

function structuredToHtml(data: StructuredReportData): string {
  return data.sections.map(structuredSectionToHtml).join("\n");
}

/** Convert report content (markdown or structured JSON) to styled HTML */
function reportToHtml(content: string): string {
  const structured = parseStructuredReport(content);
  if (structured) return structuredToHtml(structured);
  return mdToHtml(content);
}

// ── HTML for Word export ────────────────────────────────────────

export function renderHtmlForWordExport(md: string): string {
  // Auto-detect structured JSON or markdown
  const structured = parseStructuredReport(md);
  if (structured) {
    // For Word: render chart sections as canvas images, rest as HTML
    return structured.sections.map((section) => {
      let html = "";
      if (section.title) {
        html += `<h2 style="font-size:13pt;color:${exportColors.heading};font-weight:700;margin:18px 0 6px;padding-bottom:3px;border-bottom:1.5px solid ${exportColors.heading};">${section.title}</h2>`;
      }
      if (section.type === "text") {
        html += mdToHtml(section.content);
      } else if (section.type === "table") {
        html += '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
        html += "<thead><tr>";
        section.headers.forEach((h) => {
          html += `<th bgcolor="${exportColors.tableHeaderBg}" style="background-color:${exportColors.tableHeaderBg};color:#fff;padding:7px 10px;border:1px solid ${exportColors.tableHeaderBorder};text-align:left;font-weight:700;font-size:8.5pt;">${h}</th>`;
        });
        html += "</tr></thead><tbody>";
        section.rows.forEach((row, ri) => {
          const bg = ri % 2 === 0 ? "#ffffff" : exportColors.tableRowAlt;
          html += `<tr bgcolor="${bg}" style="background-color:${bg};">`;
          row.forEach((cell) => {
            html += `<td style="padding:6px 10px;border:1px solid ${exportColors.tableBorder};font-size:9pt;">${cell}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
      } else if (section.type === "chart") {
        const normalizedData = section.data.map((row) => {
          const newRow: Record<string, string | number> = {};
          for (const [k, v] of Object.entries(row)) {
            newRow[k] = section.keys.includes(k) ? toNum(v) : v;
          }
          return newRow;
        });
        const chartType = section.chartType || "bar";
        const imgDataUrl = renderChartImage(chartType, normalizedData, section.keys, section.nameKey);
        html += `<p style="text-align:center;margin:10px 0;"><img src="${imgDataUrl}" width="580" style="max-width:100%;" /></p>`;
      }
      return html;
    }).join("\n");
  }
  return mdToHtml(md);
}

// ── PDF generation (html2canvas approach) ───────────────────────

export async function generatePdfReport(opts: ExportOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = pdf.internal.pageSize.getWidth();  // 210
  const PH = pdf.internal.pageSize.getHeight(); // 297
  const M = 16;
  const CW = PW - 2 * M;
  const ts = formatTimestamp();

  // Load Tarka logo and Bosch supergraphic strip
  const [logo, boschStrip] = await Promise.all([
    loadImageInfo("/image1.png"),
    loadImageInfo("/bosch-rainbow.svg"),
  ]);

  /** Draw the Bosch supergraphic strip at the given y position with given height.
   *  Crops a horizontal slice from the top of the source image at full width
   *  so the graphic keeps its natural proportions instead of being squished.
   *  Uses the already-loaded HTMLImageElement to avoid async race conditions. */
  const drawBoschStrip = (yPos: number, stripH: number) => {
    if (boschStrip) {
      // Calculate how many source pixels correspond to the desired strip height
      // while keeping the full width → natural aspect crop from the top.
      const srcW = boschStrip.w;
      const srcH = boschStrip.h;
      const mmToSrcPx = srcW / PW; // source pixels per mm (width-based)
      const cropH = Math.min(Math.round(stripH * mmToSrcPx), srcH);

      // Render the cropped slice using the already-loaded img element (sync)
      const tmpC = document.createElement("canvas");
      tmpC.width = srcW;
      tmpC.height = cropH;
      const tmpCtx = tmpC.getContext("2d")!;
      tmpCtx.drawImage(boschStrip.img, 0, 0, srcW, cropH, 0, 0, srcW, cropH);

      pdf.addImage(tmpC.toDataURL("image/png"), "PNG", 0, yPos, PW, stripH);
    } else {
      // Fallback: solid blue bar if strip fails to load
      pdf.setFillColor(...hexToRgb(boschBlue[50]));
      pdf.rect(0, yPos, PW, stripH, "F");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // COVER PAGE — centered vertically & horizontally
  // ═══════════════════════════════════════════════════════════════

  // Top Bosch supergraphic strip
  drawBoschStrip(0, 2);

  // ── Calculate Tarka logo dimensions (620×300 → 2.07:1 ratio) ──
  const maxLogoH = 18; // height in mm

  let logo1W = 0, logo1H = 0;
  if (logo) {
    const a1 = logo.w / logo.h; // ~2.07
    logo1H = maxLogoH;
    logo1W = logo1H * a1;
  }

  const logosPresent = !!logo;
  const totalLogosW = logo1W;
  const logosBlockH = logosPresent ? maxLogoH + 10 : 0;

  // ── Calculate other block heights ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const labelBlockH = 6; // "MARKET RESEARCH REPORT" label

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  const titleLines: string[] = pdf.splitTextToSize(opts.title, CW - 16);
  const titleBlockH = titleLines.length * 13;

  const decoLineH = 16;
  const tsLineH = 7;
  const poweredByH = 10; // "Powered by BGSW/BDO" line

  const totalBlockH =
    logosBlockH +
    labelBlockH + 6 +
    titleBlockH +
    decoLineH +
    tsLineH + 6 +
    poweredByH;

  // Vertical center start (between top bar and bottom bar)
  const usableTop = 12;
  const usableBottom = PH - 18;
  let cy = usableTop + (usableBottom - usableTop - totalBlockH) / 2;

  // ── Tarka logo (centered) ──
  if (logosPresent && logo) {
    const logoX = PW / 2 - totalLogosW / 2;
    pdf.addImage(logo.dataUrl, "PNG", logoX, cy, logo1W, logo1H);
    cy += logosBlockH;
  }

  // ── Subtitle label ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...hexToRgb(exportColors.footerText));
  cy += labelBlockH + 6;

  // ── Report title ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(...hexToRgb(boschBlue[30]));
  titleLines.forEach((line: string, idx: number) => {
    pdf.text(line, PW / 2, cy + idx * 13, { align: "center" });
  });
  cy += titleBlockH;

  // ── Decorative line ──
  cy += decoLineH / 2;
  pdf.setDrawColor(...hexToRgb(boschBlue[50]));
  pdf.setLineWidth(0.6);
  pdf.line(PW / 2 - 32, cy, PW / 2 + 32, cy);
  cy += decoLineH / 2;

  // ── Timestamp ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...hexToRgb(boschGray[60]));
  pdf.text(ts, PW / 2, cy, { align: "center" });
  cy += tsLineH + 6;

  // ── Powered by BGSW/BDO ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...hexToRgb(boschBlue[50]));
  pdf.text("Powered by BGSW/BDO & BUD", PW / 2, cy, { align: "center" });

  // ── Footer area on cover page ──
  // Separator line above footer
  pdf.setDrawColor(...hexToRgb(boschBlue[50]));
  pdf.setLineWidth(0.4);
  pdf.line(M, PH - 22, PW - M, PH - 22);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...hexToRgb(exportColors.footerText));
  pdf.text("Confidential \u2014 For internal use only", PW / 2, PH - 16, {
    align: "center",
  });

  // Bottom solid Bosch Blue strip on cover page
  pdf.setFillColor(...hexToRgb(boschBlue[50]));
  pdf.rect(0, PH - 7, PW, 7, "F");

  // ═══════════════════════════════════════════════════════════════
  // CONTENT PAGES  (rendered via html2canvas)
  // ═══════════════════════════════════════════════════════════════

  const styledHtml = reportToHtml(opts.reportMarkdown);

  // 1 mm ≈ 3.7795 px at 96 dpi
  const containerPx = Math.round(CW * 3.7795);
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; left:-20000px; top:0; z-index:-9999;
    width:${containerPx}px; background:#fff; padding:8px 0;
    font-family:Arial,Helvetica,sans-serif; font-size:10pt;
    color:${exportColors.text}; line-height:1.6;
  `;
  el.innerHTML = styledHtml;
  document.body.appendChild(el);

  try {
    const CANVAS_SCALE = 2.5;
    const canvas = await html2canvas(el, {
      scale: CANVAS_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: containerPx,
    });

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const mmPerPx = CW / canvasW;

    // Collect all links from the rendered DOM before we remove it.
    // getBoundingClientRect() gives positions relative to the viewport;
    // el is fixed to top:0/left:-20000px so we offset by el's own rect.
    const elRect = el.getBoundingClientRect();
    interface LinkInfo { href: string; x: number; y: number; w: number; h: number; }
    const links: LinkInfo[] = [];
    el.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      const r = a.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const href = a.href;
      if (!href || href.startsWith("javascript")) return;
      // Convert DOM px → canvas px (accounting for scale)
      links.push({
        href,
        x: (r.left - elRect.left) * CANVAS_SCALE,
        y: (r.top  - elRect.top)  * CANVAS_SCALE,
        w: r.width  * CANVAS_SCALE,
        h: r.height * CANVAS_SCALE,
      });
    });

    // Usable content area per page (top strip 1.5mm + margin + footer 20mm)
    const topStart = M + 2;
    const contentAreaH = PH - topStart - 22;
    const pxPerPage = Math.floor(contentAreaH / mmPerPx);

    // ── Smart page-break: find safe cut points (whitespace rows) ──
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = canvasW;
    tmpCanvas.height = 1;
    const tmpCtx = tmpCanvas.getContext("2d")!;

    function isRowWhitespace(y: number): boolean {
      tmpCtx.clearRect(0, 0, canvasW, 1);
      tmpCtx.drawImage(canvas, 0, y, canvasW, 1, 0, 0, canvasW, 1);
      const data = tmpCtx.getImageData(0, 0, canvasW, 1).data;
      for (let x = 0; x < canvasW * 4; x += 4) {
        if (data[x] < 250 || data[x + 1] < 250 || data[x + 2] < 250) return false;
      }
      return true;
    }

    // Build page break points
    const breakPoints: number[] = [0];
    let cursor = 0;
    while (cursor < canvasH) {
      const idealEnd = cursor + pxPerPage;
      if (idealEnd >= canvasH) break;
      const searchStart = idealEnd;
      const searchEnd = Math.max(cursor + Math.floor(pxPerPage * 0.85), cursor + 50);
      let bestBreak = idealEnd;
      for (let y = searchStart; y >= searchEnd; y--) {
        if (isRowWhitespace(y)) { bestBreak = y; break; }
      }
      breakPoints.push(bestBreak);
      cursor = bestBreak;
    }
    breakPoints.push(canvasH);

    const pagesNeeded = breakPoints.length - 1;

    for (let p = 0; p < pagesNeeded; p++) {
      pdf.addPage();
      drawBoschStrip(0, 1.5);

      const srcY = breakPoints[p];
      const srcH = breakPoints[p + 1] - srcY;
      if (srcH <= 0) continue;

      const slice = document.createElement("canvas");
      slice.width = canvasW;
      slice.height = srcH;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, srcH);
      ctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);

      const sliceH = srcH * mmPerPx;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", M, topStart, CW, sliceH);

      // ── Overlay clickable link annotations for this page slice ──
      for (const link of links) {
        // Link's canvas-px y range that falls within this slice
        const linkTop    = link.y - srcY;
        const linkBottom = link.y + link.h - srcY;
        if (linkBottom <= 0 || linkTop >= srcH) continue;

        // Clamp to slice bounds
        const clampedTop    = Math.max(linkTop, 0);
        const clampedBottom = Math.min(linkBottom, srcH);
        if (clampedBottom <= clampedTop) continue;

        // Convert canvas-px → mm on this PDF page
        const xMm = M + link.x * mmPerPx;
        const yMm = topStart + clampedTop * mmPerPx;
        const wMm = link.w * mmPerPx;
        const hMm = (clampedBottom - clampedTop) * mmPerPx;

        pdf.link(xMm, yMm, wMm, hMm, { url: link.href });
      }
    }
  } finally {
    document.body.removeChild(el);
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTERS  (skip cover page)
  // ═══════════════════════════════════════════════════════════════

  const totalPages = pdf.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    pdf.setPage(p);

    // Footer separator line
    pdf.setDrawColor(...hexToRgb(boschBlue[50]));
    pdf.setLineWidth(0.2);
    pdf.line(M, PH - 18, PW - M, PH - 18);

    pdf.setFontSize(7);
    pdf.setTextColor(...hexToRgb(exportColors.footerText));
    pdf.text(`Report by: ${opts.agentNames}`, M, PH - 13);
    pdf.text("Powered by: BGSW/BDO", PW - M, PH - 13, { align: "right" });
    pdf.text(`Page ${p - 1} of ${totalPages - 1}`, PW / 2, PH - 8, {
      align: "center",
    });
  }

  // Save
  const safeName = opts.title.replace(/[^a-zA-Z0-9]/g, "_");
  pdf.save(`${safeName}_report.pdf`);
}

// ── Word export ─────────────────────────────────────────────────

export async function generateWordReport(opts: ExportOptions): Promise<void> {
  const html = renderHtmlForWordExport(opts.reportMarkdown);
  const ts = formatTimestamp();

  // Load Tarka logo
  let logoHtml = "";
  try {
    const logo1 = await loadImageInfo("/image1.png");
    if (logo1) {
      // 620×300 → 2.07:1 ratio; render at height 60px → natural width
      const h1 = 60;
      const w1 = Math.round(h1 * (logo1.w / logo1.h));
      logoHtml = `<p style="text-align:center;margin-top:40px;margin-bottom:10px;"><img src="${logo1.dataUrl}" width="${w1}" height="${h1}" alt="Tarka Logo" style="vertical-align:middle;" /></p>`;
    }
  } catch {
    /* continue without logo */
  }

  const docContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page { margin:2.5cm; mso-footer-margin:1cm; mso-header-margin:1cm; }
        @page Section1 { mso-footer:f1; }
        div.Section1 { page:Section1; }
        table#footertable { mso-element:footer; mso-element-id:f1; }
        body { font-family:Calibri,Arial,sans-serif; font-size:11pt; color:${exportColors.text}; line-height:1.6; }
        h1 { font-size:22pt; color:${exportColors.heading}; text-align:center; margin-top:60px; margin-bottom:8px; }
        .meta-info { text-align:center; font-size:10pt; color:${exportColors.footerText}; margin-bottom:6px; }
        .meta-agent { text-align:center; font-size:10pt; color:${exportColors.textMuted}; margin-top:16px; }
        .meta-powered { text-align:center; font-size:9pt; color:${exportColors.footerText}; margin-bottom:40px; }
        hr.title-divider { border:none; border-top:2px solid ${exportColors.heading}; margin:30px 60px; }
        h2 { font-size:16pt; color:${exportColors.heading}; margin-top:28px; border-bottom:1px solid ${exportColors.heading}; padding-bottom:4px; }
        h3 { font-size:13pt; color:${exportColors.text}; margin-top:18px; }
        strong { font-weight:bold; }
        em { font-style:italic; }
        ul,ol { margin-left:20px; }
        li { margin-bottom:4px; }
        blockquote { border-left:3px solid ${exportColors.blockquoteBorder}; padding-left:12px; color:${exportColors.textMuted}; font-style:italic; }
        table { border-collapse:collapse; width:100%; margin:12px 0; }
        th,td { border:1px solid ${exportColors.tableBorder}; padding:8px 10px; text-align:left; font-size:10pt; }
        th { background:${exportColors.tableHeaderBg}; color:#fff; font-weight:bold; }
        code { background:${exportColors.codeBg}; padding:2px 4px; font-family:Consolas,monospace; font-size:10pt; }
        pre { background:${exportColors.codeBg}; padding:12px; border:1px solid ${exportColors.separator}; font-family:Consolas,monospace; font-size:10pt; white-space:pre-wrap; }
        a { color:${exportColors.link}; text-decoration:underline; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${logoHtml}
        <h1>${opts.title}</h1>
        <p class="meta-info">Generated on ${ts}</p>
        <p class="meta-agent">Report Generated by: ${opts.agentNames}</p>
        <p class="meta-powered">Powered by: BGSW/BDO</p>
        <hr class="title-divider"/>
        ${html.replace(/^<h1>.*?<\/h1>/i, "")}
        <br style="page-break-before:always" clear="all"/>
        <table id="footertable" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size:7pt;color:${exportColors.footerText};" align="left">Report Generated by: ${opts.agentNames}</td>
            <td style="font-size:7pt;color:${exportColors.footerText};" align="right">Powered by: BGSW/BDO</td>
          </tr>
        </table>
      </div>
    </body>
    </html>`;

  const blob = new Blob([docContent], { type: "application/msword" });
  const { saveAs } = await import("file-saver");
  const safeName = opts.title.replace(/[^a-zA-Z0-9]/g, "_");
  saveAs(blob, `${safeName}_report.doc`);
}

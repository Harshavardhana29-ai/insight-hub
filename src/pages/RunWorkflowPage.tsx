import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Play, GitBranch, Download, Eye, FileText, Loader2,
  CheckCircle2, AlertTriangle, Clock, Bot, Database, X, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useWorkflows } from "@/hooks/use-workflows";
import { useRunWorkflow, useRunStatus, useRunLogs, useRunReport } from "@/hooks/use-runs";
import { runsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// HTML renderer — used ONLY for Word (.doc) export, not for UI display
function renderHtmlForExport(md: string): string {
  // Normalize asterisk bullets → dash bullets (preserving indentation)
  const normalized = md.replace(/^(\s*)\*(\s+)/gm, '$1-$2');

  return normalized
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!")(https?:\/\/[^\s<)"]+)/g, '<a href="$1">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/^\|[-:|\s]+\|$/gm, '')
    .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      if (rows.length > 0) {
        const header = rows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
        const body = rows.slice(1).join('\n');
        return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
      }
      return match;
    })
    .replace(/^(\s*)- (.+)$/gm, (_, indent, content) => {
      const level = Math.floor((indent || '').length / 4);
      return `<li${level > 0 ? ` style="margin-left:${level * 20}px"` : ''}>${content}</li>`;
    })
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<[huptblo])/gm, '');
}

// Custom component overrides for ReactMarkdown to integrate with Tailwind/shadcn styling
const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border">
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
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <pre className="bg-muted border border-border rounded-md p-3 overflow-x-auto my-2">
        <code className="text-xs font-mono text-foreground">{children}</code>
      </pre>
    ) : (
      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
};

/** Load an image from URL as a base64 data URL for embedding in PDF/Word */
async function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Strip markdown formatting to plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

/** Format timestamp as "March 17, 2026 at 02:45 PM" (no seconds) */
function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  }) + " at " + now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function RunWorkflowPage() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // API hooks
  const { data: workflowsData } = useWorkflows();
  const workflowsList = workflowsData?.items ?? [];
  const runMutation = useRunWorkflow();

  const isPolling = status === "running";
  const { data: runStatusData } = useRunStatus(runId, isPolling);
  const { data: runLogsData } = useRunLogs(runId, isPolling);
  const { data: reportData } = useRunReport(runId, status === "completed" && !report);

  const selectedWorkflow = workflowsList.find(w => w.id === selectedWorkflowId);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Sync polling data into local state
  useEffect(() => {
    if (runStatusData) {
      setProgress(runStatusData.progress);
      if (runStatusData.status === "completed" || runStatusData.status === "failed") {
        setStatus(runStatusData.status as RunStatus);
        // Fetch logs one final time to capture the last entries
        if (runId) {
          runsApi.logs(runId).then(data => setLogs(data)).catch(() => {});
        }
      }
    }
  }, [runStatusData, runId]);

  useEffect(() => {
    if (runLogsData) {
      setLogs(runLogsData);
    }
  }, [runLogsData]);

  useEffect(() => {
    if (reportData?.report_markdown) {
      setReport(reportData.report_markdown);
    }
  }, [reportData]);

  const runWorkflow = async () => {
    if (!selectedWorkflowId) return;
    setStatus("running");
    setLogs([]);
    setReport(null);
    setProgress(0);
    setRunId(null);

    try {
      const result = await runMutation.mutateAsync({
        workflowId: selectedWorkflowId,
        userPrompt: userPrompt,
      });
      setRunId(result.run_id);
    } catch {
      setStatus("failed");
      toast({ title: "Failed to start workflow", variant: "destructive" });
    }
  };

  const resetRun = () => {
    setStatus("idle");
    setLogs([]);
    setProgress(0);
    setReport(null);
    setRunId(null);
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!report) return;
    const html = renderHtmlForExport(report);
    const title = selectedWorkflow?.title || "Report";
    const timestamp = formatTimestamp();
    const agentNames = selectedWorkflow?.agents.map(a => a.name).join(", ") || "Unknown Agent";

    if (format === "pdf") {
      try {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        const footerY = pageHeight - 12;

        // Helper: collect all links from markdown
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|(?<!")(https?:\/\/[^\s<)"]+)/g;
        const links: { text: string; url: string }[] = [];
        let linkMatch;
        while ((linkMatch = linkRegex.exec(report)) !== null) {
          if (linkMatch[1] && linkMatch[2]) {
            links.push({ text: linkMatch[1], url: linkMatch[2] });
          } else if (linkMatch[3]) {
            links.push({ text: linkMatch[3], url: linkMatch[3] });
          }
        }

        // Helper: add footer on every page
        const addFooter = (pageNum: number, totalPages: number) => {
          pdf.setFontSize(7);
          pdf.setTextColor(150);
          pdf.text(`Report Generated by: ${agentNames}`, margin, footerY);
          pdf.text("Powered by: BGSW/BDO", pageWidth - margin, footerY, { align: "right" });
          pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY + 4, { align: "center" });
        };

        // Load Bosch logo for cover page
        let logoDataUrl: string | null = null;
        try {
          logoDataUrl = await loadImageAsDataUrl("/bosch-alt.png");
        } catch { /* logo load failed, continue without it */ }

        // ─── PAGE 1: Title Page ───
        // Blue header bar
        pdf.setFillColor(0, 123, 192);
        pdf.rect(0, 0, pageWidth, 3, "F");

        // Bosch logo centered
        if (logoDataUrl) {
          pdf.addImage(logoDataUrl, "PNG", pageWidth / 2 - 15, 12, 30, 30);
        }

        // Centered title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(0, 123, 192);
        const titleLines = pdf.splitTextToSize(title, contentWidth);
        const titleY = logoDataUrl ? 55 : 50;
        titleLines.forEach((line: string, i: number) => {
          pdf.text(line, pageWidth / 2, titleY + i * 10, { align: "center" });
        });

        // Timestamp centered
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(100);
        const tsY = titleY + titleLines.length * 10 + 10;
        pdf.text(`Generated on ${timestamp}`, pageWidth / 2, tsY, { align: "center" });

        // Agent + Powered by info
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        pdf.text(`Report Generated by: ${agentNames}`, pageWidth / 2, tsY + 14, { align: "center" });
        pdf.setTextColor(120);
        pdf.setFontSize(9);
        pdf.text("Powered by: BGSW/BDO", pageWidth / 2, tsY + 22, { align: "center" });

        // Decorative line
        pdf.setDrawColor(0, 123, 192);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 30, tsY + 30, pageWidth - margin - 30, tsY + 30);

        // ─── PAGE 2+: Content ───
        pdf.addPage();
        let cursorY = 15;

        // Parse markdown into structured blocks
        const mdLines = report.split("\n");
        let i = 0;

        const ensureSpace = (needed: number) => {
          if (cursorY + needed > pageHeight - 20) {
            pdf.addPage();
            cursorY = 15;
          }
        };

        while (i < mdLines.length) {
          const line = mdLines[i];

          // Skip the title line (already on cover page)
          if (line.startsWith("# ") && i < 3) { i++; continue; }

          // Horizontal rule
          if (line.trim() === "---") {
            ensureSpace(8);
            pdf.setDrawColor(200);
            pdf.setLineWidth(0.3);
            pdf.line(margin, cursorY, pageWidth - margin, cursorY);
            cursorY += 8;
            i++; continue;
          }

          // Table detection
          if (line.startsWith("|") && i + 1 < mdLines.length && mdLines[i + 1]?.match(/^\|[-:|\s]+\|$/)) {
            const tableLines: string[] = [];
            while (i < mdLines.length && mdLines[i].startsWith("|")) {
              if (!mdLines[i].match(/^\|[-:|\s]+\|$/)) {
                tableLines.push(mdLines[i]);
              }
              i++;
            }
            if (tableLines.length > 0) {
              const parseRow = (row: string) => row.replace(/^\||\|$/g, "").split("|").map(c => stripMarkdown(c.trim()));
              const headers = parseRow(tableLines[0]);
              const body = tableLines.slice(1).map(parseRow);

              ensureSpace(20);
              autoTable(pdf, {
                startY: cursorY,
                head: [headers],
                body: body,
                margin: { left: margin, right: margin },
                styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.2 },
                headStyles: { fillColor: [0, 123, 192], textColor: 255, fontStyle: "bold", fontSize: 8 },
                alternateRowStyles: { fillColor: [245, 248, 252] },
                theme: "grid",
              });
              cursorY = (pdf as any).lastAutoTable.finalY + 8;
            }
            continue;
          }

          // Headings
          if (line.startsWith("### ")) {
            ensureSpace(12);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(80);
            const hLines = pdf.splitTextToSize(stripMarkdown(line.replace(/^### /, "")), contentWidth);
            hLines.forEach((hl: string) => {
              ensureSpace(6);
              pdf.text(hl, margin, cursorY);
              cursorY += 6;
            });
            cursorY += 2;
            i++; continue;
          }
          if (line.startsWith("## ")) {
            ensureSpace(14);
            cursorY += 4;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(0, 123, 192);
            const hLines = pdf.splitTextToSize(stripMarkdown(line.replace(/^## /, "")), contentWidth);
            hLines.forEach((hl: string) => {
              ensureSpace(7);
              pdf.text(hl, margin, cursorY);
              cursorY += 7;
            });
            pdf.setDrawColor(0, 123, 192);
            pdf.setLineWidth(0.3);
            pdf.line(margin, cursorY + 1, pageWidth - margin, cursorY + 1);
            cursorY += 6;
            i++; continue;
          }

          // Bullet points (- or * prefix, with optional indentation for sub-bullets)
          const bulletMatch = line.match(/^(\s*)[*-]\s+(.*)/);
          if (bulletMatch) {
            const indent = bulletMatch[1] || "";
            const level = Math.floor(indent.length / 4);
            const bulletText = stripMarkdown(bulletMatch[2]);
            const indentPx = level * 5;
            const bLines = pdf.splitTextToSize(bulletText, contentWidth - 8 - indentPx);
            ensureSpace(bLines.length * 5 + 2);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(60);
            pdf.text(level > 0 ? "◦" : "•", margin + 1 + indentPx, cursorY);
            bLines.forEach((bl: string, bi: number) => {
              pdf.text(bl, margin + 6 + indentPx, cursorY + bi * 5);
            });
            cursorY += bLines.length * 5 + 1;
            i++; continue;
          }

          // Empty lines
          if (line.trim() === "") {
            cursorY += 3;
            i++; continue;
          }

          // Regular paragraph
          const plainText = stripMarkdown(line);

          if (plainText.trim()) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(60);
            const pLines = pdf.splitTextToSize(plainText, contentWidth);
            pLines.forEach((pl: string) => {
              ensureSpace(5);
              pdf.text(pl, margin, cursorY);
              cursorY += 5;
            });
            cursorY += 2;
          }

          i++;
        }

        // Add links section at the end if there are links
        if (links.length > 0) {
          ensureSpace(20);
          cursorY += 6;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(0, 123, 192);
          pdf.text("References & Links", margin, cursorY);
          cursorY += 8;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          const seen = new Set<string>();
          links.forEach((link) => {
            if (seen.has(link.url)) return;
            seen.add(link.url);
            ensureSpace(8);
            pdf.setTextColor(0, 123, 192);
            const linkText = `${link.text !== link.url ? link.text + ": " : ""}${link.url}`;
            const truncated = linkText.length > 100 ? linkText.slice(0, 97) + "…" : linkText;
            pdf.textWithLink(truncated, margin + 4, cursorY, { url: link.url });
            pdf.text("→", margin, cursorY);
            cursorY += 6;
          });
        }

        // Apply footers to all pages
        const totalPages = pdf.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          pdf.setPage(p);
          addFooter(p, totalPages);
        }

        pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}_report.pdf`);
        toast({ title: "PDF downloaded successfully" });
      } catch (e) {
        console.error("PDF generation error:", e);
        toast({ title: "Failed to generate PDF", variant: "destructive" });
      }
    } else {
      // Word (docx) — generate a proper .doc file via HTML with MS Word XML headers
      let logoDataUrlWord: string | null = null;
      try {
        logoDataUrlWord = await loadImageAsDataUrl("/bosch-alt.png");
      } catch { /* logo load failed, continue without it */ }

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
            @page {
              margin: 2.5cm;
              mso-footer-margin: 1cm;
              mso-header-margin: 1cm;
            }
            @page Section1 {
              mso-footer: f1;
            }
            div.Section1 { page: Section1; }
            table#footertable { mso-element: footer; mso-element-id: f1; }
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; }
            h1 { font-size: 22pt; color: #007bc0; text-align: center; margin-top: 60px; margin-bottom: 8px; }
            .meta-info { text-align: center; font-size: 10pt; color: #888; margin-bottom: 6px; }
            .meta-agent { text-align: center; font-size: 10pt; color: #555; margin-top: 16px; }
            .meta-powered { text-align: center; font-size: 9pt; color: #999; margin-bottom: 40px; }
            hr.title-divider { border: none; border-top: 2px solid #007bc0; margin: 30px 60px; }
            h2 { font-size: 16pt; color: #007bc0; margin-top: 28px; border-bottom: 1px solid #007bc0; padding-bottom: 4px; }
            h3 { font-size: 13pt; color: #444; margin-top: 18px; }
            strong { font-weight: bold; }
            em { font-style: italic; }
            ul, ol { margin-left: 20px; }
            li { margin-bottom: 4px; }
            blockquote { border-left: 3px solid #007bc0; padding-left: 12px; color: #666; font-style: italic; }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            th, td { border: 1px solid #bbb; padding: 8px 10px; text-align: left; font-size: 10pt; }
            th { background: #007bc0; color: #fff; font-weight: bold; }
            code { background: #f4f4f4; padding: 2px 4px; font-family: Consolas, monospace; font-size: 10pt; }
            pre { background: #f4f4f4; padding: 12px; border: 1px solid #ddd; font-family: Consolas, monospace; font-size: 10pt; white-space: pre-wrap; }
            a { color: #007bc0; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${logoDataUrlWord ? `<p style="text-align:center;margin-top:40px;margin-bottom:10px;"><img src="${logoDataUrlWord}" width="100" height="100" alt="Bosch" /></p>` : ''}
            <h1>${title}</h1>
            <p class="meta-info">Generated on ${timestamp}</p>
            <p class="meta-agent">Report Generated by: ${agentNames}</p>
            <p class="meta-powered">Powered by: BGSW/BDO</p>
            <hr class="title-divider"/>
            ${html.replace(/^<h1>.*?<\/h1>/i, '')}
            <br style="page-break-before:always" clear="all"/>
            <table id="footertable" width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size:7pt;color:#999;" align="left">Report Generated by: ${agentNames}</td>
                <td style="font-size:7pt;color:#999;" align="right">Powered by: BGSW/BDO</td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([docContent], { type: "application/msword" });
      const { saveAs } = await import("file-saver");
      saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, "_")}_report.doc`);
      toast({ title: "Word document downloaded successfully" });
    }
  };

  const logTypeIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-bosch-green shrink-0" />;
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-bosch-yellow shrink-0" />;
      default: return <Clock className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center shadow-sm">
            <Play className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Run Workflow</h2>
            <p className="text-sm text-muted-foreground">Execute a workflow and view results</p>
          </div>
        </div>

        {/* Workflow Selection */}
        <Card className="rounded-md shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Workflow</label>
              <Select value={selectedWorkflowId} onValueChange={(v) => { setSelectedWorkflowId(v); if (status !== "idle") resetRun(); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a workflow to run…" />
                </SelectTrigger>
                <SelectContent>
                  {workflowsList.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5" />
                        {w.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWorkflow && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-accent/40 border border-border space-y-3"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{selectedWorkflow.title}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{selectedWorkflow.topic}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Data Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedWorkflow.data_sources.map(ds => (
                        <span key={ds.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-card rounded-md text-[11px] font-medium text-foreground border border-border">
                          <Database className="w-2.5 h-2.5" /> {ds.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agents</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedWorkflow.agents.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-bosch-purple/10 rounded-md text-[11px] font-medium text-bosch-purple">
                          <Bot className="w-2.5 h-2.5" /> {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* User Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                User Prompt
              </label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Describe what you want this workflow to focus on… e.g. 'Focus on European market trends in the last 7 days'"
                className="rounded-xl min-h-[80px] resize-none"
                disabled={status === "running"}
              />
              <p className="text-[11px] text-muted-foreground">Provide additional context or instructions for this workflow run.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={runWorkflow}
                disabled={!selectedWorkflowId || status === "running"}
                className="gap-2 gradient-green text-primary-foreground border-0 shadow-sm hover:opacity-90 rounded-xl"
              >
                {status === "running" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {status === "running" ? "Running…" : "Run Workflow"}
              </Button>
              {status === "completed" && (
                <Button variant="outline" onClick={resetRun} className="rounded-xl">
                  Run Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress & Logs */}
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="rounded-md shadow-sm">
              <CardContent className="p-5 space-y-4">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {status === "running" ? "Executing…" : status === "completed" ? "Completed" : "Failed"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        status === "completed" ? "bg-bosch-green" : status === "failed" ? "bg-destructive" : "gradient-blue"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Logs */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Execution Logs</p>
                  <div
                    ref={logRef}
                    className="bg-muted rounded-xl p-3 max-h-52 overflow-y-auto space-y-1.5 font-mono text-xs"
                  >
                    {logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2"
                      >
                        {logTypeIcon(log.type)}
                        <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                        <span className={`${
                          log.type === "success" ? "text-bosch-green" :
                          log.type === "error" ? "text-destructive" :
                          log.type === "warning" ? "text-bosch-yellow" :
                          "text-foreground"
                        }`}>
                          {log.message}
                        </span>
                      </motion.div>
                    ))}
                    {status === "running" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Processing…</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Report Actions */}
        {status === "completed" && report && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-md shadow-sm border-l-4 border-l-bosch-green">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-bosch-green/10 text-bosch-green flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Report Generated</p>
                      <p className="text-xs text-muted-foreground">Ready to preview and download</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowPreview(true)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => handleDownload("pdf")}
                      size="sm"
                      className="gap-1.5 gradient-blue text-primary-foreground border-0 shadow-colored hover:opacity-90 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                    <Button
                      onClick={() => handleDownload("docx")}
                      size="sm"
                      className="gap-1.5 gradient-turquoise text-primary-foreground border-0 shadow-sm hover:opacity-90 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Word
                    </Button>
                  </div>
                </div>

                {/* Inline preview snippet */}
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mb-2
                    prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1
                    prose-p:text-foreground prose-p:text-sm prose-p:leading-relaxed
                    prose-strong:text-foreground
                    line-clamp-[12] overflow-hidden relative
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {report.split('\n').slice(0, 15).join('\n')}
                    </ReactMarkdown>
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted to-transparent" />
                  </div>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    View full report →
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Full Report Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Report Preview
            </DialogTitle>
          </DialogHeader>
          {report && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <Button
                  onClick={() => handleDownload("pdf")}
                  size="sm"
                  className="gap-1.5 gradient-blue text-primary-foreground border-0 shadow-colored hover:opacity-90 rounded-xl"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
                <Button
                  onClick={() => handleDownload("docx")}
                  size="sm"
                  className="gap-1.5 gradient-turquoise text-primary-foreground border-0 shadow-sm hover:opacity-90 rounded-xl"
                >
                  <Download className="w-3.5 h-3.5" /> Download Word
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-2
                prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-1
                prose-p:text-foreground prose-p:leading-relaxed
                prose-strong:text-foreground prose-strong:font-bold
                prose-li:text-foreground prose-li:marker:text-muted-foreground
                prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {report}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

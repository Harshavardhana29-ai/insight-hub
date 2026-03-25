import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, GitBranch, ChevronDown, Loader2, Bot,
  FileText, Download, CheckCircle2, AlertTriangle, Clock, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWorkflows } from "@/hooks/use-workflows";
import { useRunWorkflow, useRunStatus, useRunLogs, useRunReport } from "@/hooks/use-runs";
import { runsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ─── Scheduler mock history (static) ─────────────────────────────
const mockHistoryReports: Record<string, { title: string; date: string; workflow: string; report: string }> = {
  h1: {
    title: "Daily AI Briefing",
    date: "Mar 24, 2026",
    workflow: "AI News Digest",
    report: `# Daily AI Briefing: March 24, 2026\n\n## Executive Summary\n\n## Major AI Model and Hardware Launches\n\n- **OpenAI - GPT-5.4 (US, March 2026):** Most powerful and efficient model for professional work, with a context window of up to 1 million tokens.\n- **Google - Gemini 3.1 Flash-Lite (US, March 2026):** Faster and more cost-effective model for large-scale workloads.\n- **NVIDIA - Rubin Supercomputer Platform (US, March 2026):** Next-generation platform for massive AI workloads.\n- **Alibaba - New AI Chip Design (China, March 2026):** Announced to meet high AI compute demand.\n\n## Rise of AI Agents and Enterprise Adoption\n\n- **Global trend (2026):** Rapid development and adoption of AI agents as proactive assistants capable of complex tasks, pushing companies to build technical and organizational structures to manage them.\n- **HSBC (UK, March 2026):** Appointed its first Chief AI Officer, David Rice, signaling strategic focus on scaling generative AI in finance.\n\n## Industry-Specific AI Trends\n\n- **Global trend (2026):** Focus is shifting from general hype to responsible, economical, and repeatable value, including smaller domain-specific models.\n- **Healthcare (March 2026):** AI is accelerating drug discovery, but a translatability gap is slowing movement into clinical practice.\n- **Siemens AG (Germany, March 2026):** Industrial software business remains resilient due to high-precision requirements in sectors like automotive and pharmaceuticals.\n\n## AI Adoption on the Rise\n\n- **Canada (March 2026):** 91% of mid-market companies are satisfied with AI progress, but only 4% believe AI is delivering transformational strategic value.`,
  },
  h2: {
    title: "Daily AI Briefing",
    date: "Mar 23, 2026",
    workflow: "AI News Digest",
    report: `# Daily AI Briefing: March 23, 2026\n\n## News Aggregator Analysis\n\n## Global AI Development\n\n- **NVIDIA GTC Highlights (San Jose, CA, March 21-23, 2026):** Announced the Vera Rubin platform and H300 GPUs; also partnered with AES, Constellation, and NextEra Energy to build a new class of AI factories with enhanced grid connectivity.\n- **OpenAI Expansion and Partnership (USA, March 22, 2026):** Projected to nearly double workforce to 8,000 by end of 2026 and partnered with AWS to deliver AI solutions to U.S. government agencies.\n- **AMD Competitive Push (USA, March 21-23, 2026):** Announced Turin data center chips and Ryzen AI 400 laptop processors; collaboration with Sony on Project Amethyst for PS5 Pro AI upscaling.\n- **Mistral AI Forge (Global, March 22, 2026):** Introduced a platform for custom AI model building with full data control.\n\n## Politics and Economy\n\n- **White House AI Framework (Washington D.C., March 21, 2026):** Released the National Policy Framework for Artificial Intelligence, framing U.S. AI leadership as a national priority.\n- **U.S. Treasury AI Initiative (Washington D.C., March 22, 2026):** Launched the AI Innovation Series to strengthen financial system resilience in the AI era.\n- **QCraft Funding Milestone (Global, March 23, 2026):** Closed a $100 million Series D round to accelerate physical AI R&D and global expansion.\n- **AI and Workforce Impact (Global, March 21-23, 2026):** Thomson Reuters and Anthropic findings show both workforce-displacement concerns and productivity upside.\n\n## Technology and Innovation\n\n- **Meta Hyperagents (Global, March 22, 2026):** Introduced self-improving agents that can also rewrite their own learning rules.\n- **Google Project Mariner (Global, March 21, 2026):** Testing an AI agent that can act on websites for tasks like ticket purchases and shopping.\n- **Tencent WeChat Integration (China, March 21, 2026):** Integrated ClawBot into WeChat for AI task triggering via simple messages.\n- **AI in Oncology - MangroveGS (Global, March 23, 2026):** Demonstrated about 80% accuracy in predicting likely tumor metastasis for treatment planning.`,
  },
  h4: {
    title: "Weekly Market Report",
    date: "Mar 11, 2024",
    workflow: "Market Trend Analysis",
    report: `# Market Trend Analysis — Week of March 11, 2024\n\n## Market Overview\n\nAnalyzed **12 market sectors** with data from Bloomberg Finance API.\n\n## Sector Performance\n\n| Sector | Weekly Change | Trend | Signal |\n|--------|:---:|:---:|:---:|\n| Technology | +2.4% | 📈 Bullish | Strong Buy |\n| Healthcare | +1.1% | 📈 Bullish | Hold |\n| Energy | -0.8% | 📉 Bearish | Watch |\n| Finance | +0.6% | ➡️ Neutral | Hold |\n| Consumer | +1.8% | 📈 Bullish | Buy |\n\n## Key Insights\n\n### Tech Sector Rally\nDriven by **strong earnings** from major cloud providers and continued AI investment.\n\n### Energy Decline\n- Oil prices dropped **3.2%** due to increased supply forecasts\n- Renewable energy stocks showed **resilience** (+0.4%)\n\n## Risk Factors\n\n1. **Interest rate uncertainty** — Fed meeting next week\n2. **Geopolitical tensions** — Potential supply chain disruptions\n3. **Earnings season** — Mixed signals from retail sector\n\n> *Next report scheduled: March 18, 2024*`,
  },
};

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// HTML renderer for Word export
function renderHtmlForExport(md: string): string {
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

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  }) + " at " + now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

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

interface ChatPageProps {
  selectedHistoryId: string | null;
  onClearHistory: () => void;
}

export default function ChatPage({ selectedHistoryId, onClearHistory }: ChatPageProps) {
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workflowPickerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: workflowsData } = useWorkflows();
  const workflowsList = workflowsData?.items ?? [];
  const runMutation = useRunWorkflow();

  const isPolling = status === "running";
  const { data: runStatusData } = useRunStatus(runId, isPolling);
  const { data: runLogsData } = useRunLogs(runId, isPolling);
  const { data: reportData } = useRunReport(runId, status === "completed" && !report);

  const selectedWorkflow = workflowsList.find(w => w.id === selectedWorkflowId);

  // Show history report
  const historyReport = selectedHistoryId ? mockHistoryReports[selectedHistoryId] : null;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (runStatusData) {
      setProgress(runStatusData.progress);
      if (runStatusData.status === "completed" || runStatusData.status === "failed") {
        setStatus(runStatusData.status as RunStatus);
        if (runId) runsApi.logs(runId).then(data => setLogs(data)).catch(() => {});
      }
    }
  }, [runStatusData, runId]);

  useEffect(() => { if (runLogsData) setLogs(runLogsData); }, [runLogsData]);
  useEffect(() => { if (reportData?.report_markdown) setReport(reportData.report_markdown); }, [reportData]);

  // Close workflow picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (workflowPickerRef.current && !workflowPickerRef.current.contains(e.target as Node)) {
        setShowWorkflowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runWorkflow = async () => {
    if (!selectedWorkflowId || !userPrompt.trim()) return;
    setStatus("running");
    setLogs([]);
    setReport(null);
    setProgress(0);
    setRunId(null);
    onClearHistory();

    try {
      const result = await runMutation.mutateAsync({ workflowId: selectedWorkflowId, userPrompt });
      setRunId(result.run_id);
    } catch {
      setStatus("failed");
      toast({ title: "Failed to start workflow", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runWorkflow();
    }
  };

  const resetRun = () => {
    setStatus("idle");
    setLogs([]);
    setProgress(0);
    setReport(null);
    setRunId(null);
    setUserPrompt("");
  };

  const handleDownload = async (format: "pdf" | "docx", reportText: string, title: string) => {
    const html = renderHtmlForExport(reportText);
    const timestamp = formatTimestamp();
    const agentNames = selectedWorkflow?.agents.map(a => a.name).join(", ") || "Research Agent";

    if (format === "pdf") {
      try {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;

        let logoDataUrl: string | null = null;
        try { logoDataUrl = await loadImageAsDataUrl("/bosch-alt.png"); } catch {}

        pdf.setFillColor(0, 123, 192);
        pdf.rect(0, 0, pageWidth, 3, "F");
        if (logoDataUrl) pdf.addImage(logoDataUrl, "PNG", pageWidth / 2 - 15, 12, 30, 30);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(0, 123, 192);
        const titleLines = pdf.splitTextToSize(title, contentWidth);
        const titleY = logoDataUrl ? 55 : 50;
        titleLines.forEach((line: string, i: number) => {
          pdf.text(line, pageWidth / 2, titleY + i * 10, { align: "center" });
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(100);
        pdf.text(`Generated on ${timestamp}`, pageWidth / 2, titleY + titleLines.length * 10 + 10, { align: "center" });

        pdf.addPage();
        let cursorY = 15;
        const mdLines = reportText.split("\n");
        let i = 0;

        const ensureSpace = (needed: number) => {
          if (cursorY + needed > pageHeight - 20) { pdf.addPage(); cursorY = 15; }
        };

        while (i < mdLines.length) {
          const line = mdLines[i];
          if (line.startsWith("# ") && i < 3) { i++; continue; }
          if (line.trim() === "---") { ensureSpace(8); cursorY += 8; i++; continue; }

          if (line.startsWith("|") && i + 1 < mdLines.length && mdLines[i + 1]?.match(/^\|[-:|\s]+\|$/)) {
            const tableLines: string[] = [];
            while (i < mdLines.length && mdLines[i].startsWith("|")) {
              if (!mdLines[i].match(/^\|[-:|\s]+\|$/)) tableLines.push(mdLines[i]);
              i++;
            }
            if (tableLines.length > 0) {
              const parseRow = (row: string) => row.replace(/^\||\|$/g, "").split("|").map(c => stripMarkdown(c.trim()));
              ensureSpace(20);
              autoTable(pdf, {
                startY: cursorY,
                head: [parseRow(tableLines[0])],
                body: tableLines.slice(1).map(parseRow),
                margin: { left: margin, right: margin },
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [0, 123, 192], textColor: 255, fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 248, 252] },
                theme: "grid",
              });
              cursorY = (pdf as any).lastAutoTable.finalY + 8;
            }
            continue;
          }

          if (line.startsWith("## ")) {
            ensureSpace(14);
            cursorY += 4;
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0, 123, 192);
            const hLines = pdf.splitTextToSize(stripMarkdown(line.replace(/^## /, "")), contentWidth);
            hLines.forEach((hl: string) => { ensureSpace(7); pdf.text(hl, margin, cursorY); cursorY += 7; });
            cursorY += 6;
            i++; continue;
          }
          if (line.startsWith("### ")) {
            ensureSpace(12);
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(80);
            const hLines = pdf.splitTextToSize(stripMarkdown(line.replace(/^### /, "")), contentWidth);
            hLines.forEach((hl: string) => { ensureSpace(6); pdf.text(hl, margin, cursorY); cursorY += 6; });
            cursorY += 2;
            i++; continue;
          }

          const bulletMatch = line.match(/^(\s*)[*-]\s+(.*)/);
          if (bulletMatch) {
            const level = Math.floor((bulletMatch[1] || "").length / 4);
            const bulletText = stripMarkdown(bulletMatch[2]);
            const indentPx = level * 5;
            const bLines = pdf.splitTextToSize(bulletText, contentWidth - 8 - indentPx);
            ensureSpace(bLines.length * 5 + 2);
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
            pdf.text(level > 0 ? "◦" : "•", margin + 1 + indentPx, cursorY);
            bLines.forEach((bl: string, bi: number) => { pdf.text(bl, margin + 6 + indentPx, cursorY + bi * 5); });
            cursorY += bLines.length * 5 + 1;
            i++; continue;
          }

          if (line.trim() === "") { cursorY += 3; i++; continue; }

          const plainText = stripMarkdown(line);
          if (plainText.trim()) {
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
            const pLines = pdf.splitTextToSize(plainText, contentWidth);
            pLines.forEach((pl: string) => { ensureSpace(5); pdf.text(pl, margin, cursorY); cursorY += 5; });
            cursorY += 2;
          }
          i++;
        }

        const totalPages = pdf.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          pdf.setPage(p);
          pdf.setFontSize(7); pdf.setTextColor(150);
          pdf.text(`Powered by: BGSW/BDO`, pageWidth - margin, pageHeight - 12, { align: "right" });
          pdf.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        }

        pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}_report.pdf`);
        toast({ title: "PDF downloaded successfully" });
      } catch (e) {
        console.error("PDF generation error:", e);
        toast({ title: "Failed to generate PDF", variant: "destructive" });
      }
    } else {
      let logoDataUrlWord: string | null = null;
      try { logoDataUrlWord = await loadImageAsDataUrl("/bosch-alt.png"); } catch {}
      const timestamp = formatTimestamp();

      const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8">
        <style>
          @page { margin: 2.5cm; }
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; }
          h1 { font-size: 22pt; color: #007bc0; text-align: center; }
          h2 { font-size: 16pt; color: #007bc0; border-bottom: 1px solid #007bc0; padding-bottom: 4px; }
          h3 { font-size: 13pt; color: #444; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          th, td { border: 1px solid #bbb; padding: 8px 10px; text-align: left; font-size: 10pt; }
          th { background: #007bc0; color: #fff; font-weight: bold; }
          a { color: #007bc0; }
        </style></head>
        <body>
          ${logoDataUrlWord ? `<p style="text-align:center;"><img src="${logoDataUrlWord}" width="100" height="100" /></p>` : ''}
          <h1>${title}</h1>
          <p style="text-align:center;font-size:10pt;color:#888;">Generated on ${timestamp}</p>
          <hr style="border:none;border-top:2px solid #007bc0;margin:30px 60px;"/>
          ${html.replace(/^<h1>.*?<\/h1>/i, '')}
        </body></html>`;
      const blob = new Blob([docContent], { type: "application/msword" });
      const { saveAs } = await import("file-saver");
      saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, "_")}_report.doc`);
      toast({ title: "Word document downloaded" });
    }
  };

  const logTypeIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />;
      case "error": return <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />;
      case "warning": return <AlertTriangle className="w-3 h-3 text-warning shrink-0" />;
      default: return <Clock className="w-3 h-3 text-primary shrink-0" />;
    }
  };

  // Display report content (either history or live run)
  const displayReport = historyReport ? historyReport.report : report;
  const displayTitle = historyReport ? historyReport.title : selectedWorkflow?.title || "Report";
  const isShowingHistory = !!historyReport;
  const showLanding = status === "idle" && !isShowingHistory;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Content Area */}
      <div className="flex-1 overflow-y-auto">
        {showLanding ? (
          /* Landing - ChatGPT style */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Market Research Assistant
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-8">
                Select a workflow and describe your research query to get started.
              </p>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {[
                  "Analyze latest AI industry trends",
                  "Generate weekly market report",
                  "Compare tech sector performance",
                  "Summarize global finance news",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setUserPrompt(suggestion)}
                    className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          /* Results / Running area */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* User query bubble */}
            {(userPrompt || isShowingHistory) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                  <p className="text-sm">{isShowingHistory ? `Show report: ${historyReport?.title}` : userPrompt}</p>
                  {(selectedWorkflow || isShowingHistory) && (
                    <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                      <GitBranch className="w-3 h-3" />
                      <span className="text-xs">{isShowingHistory ? historyReport?.workflow : selectedWorkflow?.title}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Running state */}
            {status === "running" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Processing your request…</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-blue"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Logs */}
                  <div
                    ref={logRef}
                    className="bg-muted/50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]"
                  >
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        {logTypeIcon(log.type)}
                        <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                        <span className="text-foreground">{log.message}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing…</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Failed state */}
            {status === "failed" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="max-w-[85%] bg-card border border-destructive/30 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Workflow execution failed</span>
                  </div>
                  <Button onClick={resetRun} size="sm" variant="outline" className="mt-2 text-xs">
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Report display */}
            {displayReport && (status === "completed" || isShowingHistory) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isShowingHistory ? 0 : 0.2 }}
                className="flex justify-start"
              >
                <div className="w-full bg-card border border-border rounded-2xl rounded-bl-md px-4 md:px-6 py-4 space-y-4">
                  {/* Report header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{displayTitle}</span>
                      {isShowingHistory && (
                        <Badge variant="secondary" className="text-[10px]">{historyReport?.date}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => setShowPreview(true)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <Eye className="w-3 h-3" /> Full View
                      </Button>
                      <Button
                        onClick={() => handleDownload("pdf", displayReport, displayTitle)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                      <Button
                        onClick={() => handleDownload("docx", displayReport, displayTitle)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <Download className="w-3 h-3" /> Word
                      </Button>
                    </div>
                  </div>

                  {/* Inline report */}
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mb-2
                    prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1 prose-h2:text-primary
                    prose-p:text-foreground prose-p:text-sm prose-p:leading-relaxed
                    prose-strong:text-foreground
                    prose-li:text-foreground prose-li:text-sm
                    prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {displayReport}
                    </ReactMarkdown>
                  </div>

                  {!isShowingHistory && status === "completed" && (
                    <div className="pt-2 border-t border-border">
                      <Button onClick={resetRun} variant="outline" size="sm" className="text-xs">
                        New Research
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Bar */}
      {!isShowingHistory && (
        <div className="shrink-0 border-t border-border bg-background px-3 md:px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
              {/* Workflow selector */}
              <div className="relative" ref={workflowPickerRef}>
                <button
                  onClick={() => setShowWorkflowPicker(!showWorkflowPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-accent text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{selectedWorkflow?.title || "Workflow"}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showWorkflowPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute bottom-full mb-2 left-0 w-64 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                    >
                      <div className="p-2 border-b border-border">
                        <p className="text-xs font-semibold text-foreground px-2">Select Workflow</p>
                      </div>
                      <div className="p-1 max-h-48 overflow-y-auto">
                        {workflowsList.map(w => (
                          <button
                            key={w.id}
                            onClick={() => { setSelectedWorkflowId(w.id); setShowWorkflowPicker(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedWorkflowId === w.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{w.title}</span>
                            </div>
                          </button>
                        ))}
                        {workflowsList.length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2">No workflows found</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input */}
              <textarea
                ref={inputRef}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your research query…"
                disabled={status === "running"}
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-1.5 min-h-[36px] max-h-32"
                style={{ fieldSizing: "content" } as any}
              />

              {/* Send button */}
              <Button
                onClick={runWorkflow}
                disabled={!selectedWorkflowId || !userPrompt.trim() || status === "running"}
                size="icon"
                className="shrink-0 h-8 w-8 rounded-lg"
              >
                {status === "running" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Powered by BGSW/BDO · Market Research Agentic Suite
            </p>
          </div>
        </div>
      )}

      {/* History report bottom bar */}
      {isShowingHistory && (
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Viewing historical report · {historyReport?.date}
            </p>
            <Button onClick={onClearHistory} variant="outline" size="sm" className="text-xs gap-1.5">
              <X className="w-3 h-3" /> Close
            </Button>
          </div>
        </div>
      )}

      {/* Full Report Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {displayTitle}
            </DialogTitle>
          </DialogHeader>
          {displayReport && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <Button
                  onClick={() => handleDownload("pdf", displayReport, displayTitle)}
                  size="sm"
                  className="gap-1.5 gradient-blue text-primary-foreground border-0"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button
                  onClick={() => handleDownload("docx", displayReport, displayTitle)}
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Word
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-primary
                prose-p:text-foreground prose-p:leading-relaxed
                prose-strong:text-foreground prose-strong:font-bold
                prose-li:text-foreground prose-li:marker:text-muted-foreground
                prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {displayReport}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

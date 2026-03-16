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

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// Simple markdown to HTML renderer
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
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
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<[huptblo])/gm, '');
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
    const html = renderMarkdown(report);
    const title = selectedWorkflow?.title || "Report";
    const timestamp = new Date().toLocaleDateString();

    if (format === "pdf") {
      try {
        const { default: jsPDF } = await import("jspdf");
        const { default: html2canvas } = await import("html2canvas");

        // Create a hidden container with styled HTML for rendering
        const container = document.createElement("div");
        container.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;padding:40px;background:#fff;font-family:Arial,sans-serif;color:#111;";
        container.innerHTML = `
          <div style="border-bottom:2px solid #007bc0;padding-bottom:12px;margin-bottom:24px;">
            <h1 style="font-size:22px;margin:0 0 4px 0;color:#007bc0;">${title}</h1>
            <p style="font-size:12px;color:#666;margin:0;">Generated on ${timestamp}</p>
          </div>
          <div style="font-size:14px;line-height:1.7;">${html}</div>
        `;
        document.body.appendChild(container);

        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, margin - yOffset, contentWidth, imgHeight);
          yOffset += pageHeight - margin * 2;
        }

        pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}_report.pdf`);
        toast({ title: "PDF downloaded successfully" });
      } catch {
        toast({ title: "Failed to generate PDF", variant: "destructive" });
      }
    } else {
      // Word (docx) — generate a proper .doc file via HTML with MS Word XML headers
      const docContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; margin: 40px; }
            h1 { font-size: 20pt; color: #007bc0; border-bottom: 2px solid #007bc0; padding-bottom: 8px; }
            h2 { font-size: 16pt; color: #333; margin-top: 24px; }
            h3 { font-size: 13pt; color: #555; }
            strong { font-weight: bold; }
            ul, ol { margin-left: 20px; }
            li { margin-bottom: 4px; }
            blockquote { border-left: 3px solid #007bc0; padding-left: 12px; color: #666; font-style: italic; }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10pt; }
            th { background: #f0f0f0; font-weight: bold; }
            code { background: #f4f4f4; padding: 2px 4px; font-family: Consolas, monospace; font-size: 10pt; }
            pre { background: #f4f4f4; padding: 12px; border: 1px solid #ddd; font-family: Consolas, monospace; font-size: 10pt; }
            hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="font-size:9pt;color:#999;">Generated on ${timestamp}</p>
          <hr/>
          ${html}
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
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(report.split('\n').slice(0, 15).join('\n')) }} />
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
                prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md
                prose-table:border-collapse prose-th:bg-muted prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:text-muted-foreground prose-th:uppercase
                prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-sm
              ">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

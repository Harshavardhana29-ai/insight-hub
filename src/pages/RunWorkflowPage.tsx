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
import { generatePdfReport, generateWordReport } from "@/lib/pdf-export";

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// renderHtmlForExport, stripMarkdown, formatTimestamp, loadImageAsDataUrl
// are now imported from @/lib/pdf-export

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
    const title = selectedWorkflow?.title || "Report";
    const agentNames = selectedWorkflow?.agents.map(a => a.name).join(", ") || "Unknown Agent";
    const exportOpts = {
      reportMarkdown: report,
      title,
      agentNames,
      topic: selectedWorkflow?.topic,
      dataSources: selectedWorkflow?.data_sources?.map(ds => ds.title),
    };

    try {
      if (format === "pdf") {
        await generatePdfReport(exportOpts);
        toast({ title: "PDF downloaded successfully" });
      } else {
        await generateWordReport(exportOpts);
        toast({ title: "Word document downloaded successfully" });
      }
    } catch (e) {
      console.error("Export error:", e);
      toast({ title: `Failed to generate ${format === "pdf" ? "PDF" : "Word document"}`, variant: "destructive" });
    }
  };

  const logTypeIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />;
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />;
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
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-md text-[11px] font-medium text-primary">
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
                        status === "completed" ? "bg-primary" : status === "failed" ? "bg-destructive" : "gradient-blue"
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
                          log.type === "success" ? "text-primary" :
                          log.type === "error" ? "text-destructive" :
                          log.type === "warning" ? "text-warning" :
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
            <Card className="rounded-md shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
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

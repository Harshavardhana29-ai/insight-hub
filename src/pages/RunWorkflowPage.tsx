import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Play, GitBranch, Download, Eye, FileText, Loader2,
  CheckCircle2, AlertTriangle, Clock, Bot, Database, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const mockWorkflows = [
  { id: "1", title: "AI News Digest", topic: "AI", agents: ["News Aggregator", "Sentiment Analyzer"], dataSources: ["Gartner AI Hype Cycle 2024", "OpenAI Research Papers"] },
  { id: "2", title: "Market Trend Analysis", topic: "Finance", agents: ["Trend Detector", "Report Generator"], dataSources: ["Bloomberg Finance API"] },
  { id: "3", title: "Tech Industry Monitor", topic: "Technology", agents: ["News Aggregator", "Data Extractor", "Report Generator"], dataSources: ["TechCrunch AI Trends"] },
  { id: "4", title: "Sports Analytics Weekly", topic: "Sports", agents: ["Data Extractor", "Sentiment Analyzer"], dataSources: ["ESPN Sports Analytics"] },
];

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

const MOCK_LOGS: LogEntry[] = [
  { time: "00:00", message: "Initializing workflow execution…", type: "info" },
  { time: "00:02", message: "Connecting to data sources…", type: "info" },
  { time: "00:05", message: "Data source connection established", type: "success" },
  { time: "00:08", message: "Agent: News Aggregator — scanning 12 sources…", type: "info" },
  { time: "00:15", message: "Agent: News Aggregator — collected 47 articles", type: "success" },
  { time: "00:18", message: "Agent: Sentiment Analyzer — processing articles…", type: "info" },
  { time: "00:32", message: "Agent: Sentiment Analyzer — analysis complete", type: "success" },
  { time: "00:35", message: "Generating output report…", type: "info" },
  { time: "00:42", message: "Report generated successfully", type: "success" },
  { time: "00:45", message: "Workflow execution completed", type: "success" },
];

const MOCK_REPORT = `# AI News Digest — Live Run Report

## Executive Summary

Today's AI landscape shows **significant momentum** in enterprise adoption, with 47 articles analyzed across major publications.

## Key Findings

### 1. Enterprise AI Adoption Accelerates
Gartner reports that **65% of enterprises** have deployed at least one AI solution in production, up from 48% last year.

- Cloud-based AI services grew **32% YoY**
- On-premise deployments remain strong in regulated industries
- Average ROI reported at **3.2x** within 18 months

### 2. Generative AI in Production
OpenAI's latest research papers highlight:
- Improved reasoning capabilities in large language models
- New benchmarks for code generation accuracy (**94.2% pass rate**)
- Reduced hallucination rates by **40%** compared to previous models

### 3. Regulatory Landscape
| Region | Status | Key Focus |
|--------|--------|-----------|
| EU | Active | AI Act enforcement begins |
| US | Proposed | Executive order on safe AI |
| Asia | Mixed | Country-specific frameworks |

## Sentiment Analysis

- **Positive**: 68% of articles
- **Neutral**: 22% of articles
- **Negative**: 10% of articles

> *"AI is no longer a competitive advantage — it's a competitive necessity."* — Gartner Report

## Recommendations

1. Monitor EU AI Act compliance requirements
2. Evaluate generative AI for internal workflows
3. Invest in AI literacy programs for teams`;

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
  const [status, setStatus] = useState<RunStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const selectedWorkflow = mockWorkflows.find(w => w.id === selectedWorkflowId);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const runWorkflow = () => {
    if (!selectedWorkflowId) return;
    setStatus("running");
    setLogs([]);
    setReport(null);
    setProgress(0);

    // Simulate log entries over time
    MOCK_LOGS.forEach((log, i) => {
      setTimeout(() => {
        setLogs(prev => [...prev, log]);
        setProgress(Math.round(((i + 1) / MOCK_LOGS.length) * 100));

        // On last log, complete
        if (i === MOCK_LOGS.length - 1) {
          setTimeout(() => {
            setStatus("completed");
            setReport(MOCK_REPORT);
          }, 500);
        }
      }, (i + 1) * 800);
    });
  };

  const resetRun = () => {
    setStatus("idle");
    setLogs([]);
    setProgress(0);
    setReport(null);
  };

  const handleDownload = (format: "pdf" | "docx") => {
    // Mock download - in production this would generate actual files
    const blob = new Blob([report || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report.${format === "pdf" ? "pdf" : "docx"}`;
    a.click();
    URL.revokeObjectURL(url);
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
                  {mockWorkflows.map(w => (
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
                      {selectedWorkflow.dataSources.map(ds => (
                        <span key={ds} className="inline-flex items-center gap-1 px-2 py-0.5 bg-card rounded-md text-[11px] font-medium text-foreground border border-border">
                          <Database className="w-2.5 h-2.5" /> {ds}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agents</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedWorkflow.agents.map(a => (
                        <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-bosch-purple/10 rounded-md text-[11px] font-medium text-bosch-purple">
                          <Bot className="w-2.5 h-2.5" /> {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

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

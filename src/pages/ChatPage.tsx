import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, GitBranch, ChevronDown, Loader2, Bot,
  Download, CheckCircle2, AlertTriangle, Clock, ChevronRight, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWorkflows } from "@/hooks/use-workflows";
import { useRunStatus, useRunLogs, useRunReport } from "@/hooks/use-runs";
import { useChatSession, useSendMessage } from "@/hooks/use-chat";
import { runsApi, type ChatMessageApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { generatePdfReport, generateWordReport } from "@/lib/pdf-export";
import MarkdownChart, { parseChartData } from "@/components/MarkdownChart";
import StructuredReport, { parseStructuredReport } from "@/components/StructuredReport";
import { formatDateTime } from "@/lib/format-time";

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
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
    if (isBlock) {
      const text = String(children).replace(/\n$/, "");
      // Try rendering as a chart if the code block contains table-like data
      const chartData = parseChartData(text);
      if (chartData) {
        return <MarkdownChart text={text} />;
      }
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
  // Also handle fenced code blocks without a language tag (```\n...\n```)
  pre: ({ children }) => {
    // Extract text from the <code> child inside <pre>
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (Array.isArray(node)) return node.map(extractText).join("");
      if (node && typeof node === "object" && "props" in node) {
        return extractText((node as React.ReactElement).props.children);
      }
      return "";
    };
    const text = extractText(children).replace(/\n$/, "");
    const chartData = parseChartData(text);
    if (chartData) {
      return <MarkdownChart text={text} />;
    }
    // Default: render the <pre> as-is (its <code> child handles styling)
    return <>{children}</>;
  },
};

interface ChatPageProps {
  sessionId: string | null;
  cronReport: { title: string; date: string; workflow: string; report: string } | null;
  onClearCronReport: () => void;
}

export default function ChatPage({ sessionId, cronReport, onClearCronReport }: ChatPageProps) {
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [thinkingOpen, setThinkingOpen] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workflowPickerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: workflowsData } = useWorkflows();
  const workflowsList = workflowsData?.items ?? [];
  const selectedWorkflow = workflowsList.find(w => w.id === selectedWorkflowId);

  // Chat session data
  const { data: sessionData, refetch: refetchSession } = useChatSession(sessionId);
  const sendMessageMutation = useSendMessage();
  const messages: ChatMessageApiResponse[] = sessionData?.messages ?? [];

  // Run polling
  const isPolling = status === "running";
  const { data: runStatusData } = useRunStatus(activeRunId, isPolling);
  const { data: runLogsData } = useRunLogs(activeRunId, isPolling);
  const { data: reportData } = useRunReport(activeRunId, status === "completed");

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, logs]);

  // Poll run status
  useEffect(() => {
    if (runStatusData) {
      setProgress(runStatusData.progress);
      if (runStatusData.status === "completed" || runStatusData.status === "failed") {
        setStatus(runStatusData.status as RunStatus);
        // Fetch final logs
        if (activeRunId) runsApi.logs(activeRunId).then(setLogs).catch(() => {});
      }
    }
  }, [runStatusData, activeRunId]);

  useEffect(() => { if (runLogsData) setLogs(runLogsData); }, [runLogsData]);

  // When run completes, refetch session to get the assistant message
  useEffect(() => {
    if (reportData?.report_markdown && status === "completed") {
      // The backend background task already saved the assistant message
      // Just refetch the session to see it
      const timer = setTimeout(() => refetchSession(), 1500);
      return () => clearTimeout(timer);
    }
  }, [reportData, status, refetchSession]);

  // Reset run state when session changes
  useEffect(() => {
    setStatus("idle");
    setActiveRunId(null);
    setLogs([]);
    setProgress(0);
    setUserPrompt("");
  }, [sessionId]);

  // Log scroll
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

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

  const handleSend = useCallback(async () => {
    if (!sessionId || !userPrompt.trim() || !selectedWorkflowId) return;
    const prompt = userPrompt.trim();
    const workflowId = selectedWorkflowId;

    setUserPrompt("");

    try {
      const msg = await sendMessageMutation.mutateAsync({
        sessionId,
        content: prompt,
        workflowId,
      });

      // If the message triggered a run, poll it
      if (msg.run_id) {
        setActiveRunId(msg.run_id);
        setStatus("running");
        setLogs([]);
        setProgress(0);
        setThinkingOpen(false);
      }

      refetchSession();
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }, [sessionId, userPrompt, selectedWorkflowId, sendMessageMutation, refetchSession, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedWorkflowId) handleSend();
    }
  };

  const handleDownload = async (format: "pdf" | "docx", reportText: string, title: string) => {
    const agentNames = selectedWorkflow?.agents.map(a => a.name).join(", ") || "Research Agent";
    const exportOpts = {
      reportMarkdown: reportText,
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
        toast({ title: "Word document downloaded" });
      }
    } catch (e) {
      console.error("Export error:", e);
      toast({ title: `Failed to generate ${format === "pdf" ? "PDF" : "Word document"}`, variant: "destructive" });
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

  const showLanding = !cronReport && (messages.length === 0 && status === "idle");
  const showCronReport = !!cronReport;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Content Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {showLanding ? (
          /* ─── Landing ─── */
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
                Tarka
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-8">
                What do you want to know today?
              </p>
            </motion.div>
          </div>
        ) : showCronReport ? (
          /* ─── Cron Report View ─── */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{cronReport.title}</span>
              <Badge variant="secondary" className="text-[10px]">{formatDateTime(cronReport.date)}</Badge>
              <Badge variant="outline" className="text-[10px]">{cronReport.workflow}</Badge>
            </div>
            {(() => {
              const structured = parseStructuredReport(cronReport.report);
              if (structured) return <StructuredReport data={structured} />;
              return (
                <div className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mb-2
                  prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1 prose-h2:text-primary
                  prose-p:text-foreground prose-p:text-sm prose-p:leading-relaxed
                  prose-strong:text-foreground prose-li:text-foreground prose-li:text-sm
                  prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {cronReport.report}
                  </ReactMarkdown>
                </div>
              );
            })()}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
              <Button
                onClick={() => handleDownload("pdf", cronReport.report, cronReport.title)}
                variant="ghost" size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Download className="w-3 h-3" /> PDF
              </Button>
              <Button
                onClick={() => handleDownload("docx", cronReport.report, cronReport.title)}
                variant="ghost" size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Download className="w-3 h-3" /> Word
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Chat Session Messages ─── */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* Render all persisted messages */}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {msg.role === "user" ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.workflow_title && (
                        <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                          <GitBranch className="w-3 h-3" />
                          <span className="text-xs">{msg.workflow_title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div className="flex justify-start">
                    <div className="max-w-[90%]">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {msg.workflow_title || "Assistant"}
                        </span>
                      </div>

                      {msg.message_type === "error" ? (
                        <div className="bg-card border border-destructive/30 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">{msg.content}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const structured = parseStructuredReport(msg.content);
                            if (structured) return <StructuredReport data={structured} />;
                            return (
                              <div className="prose prose-sm dark:prose-invert max-w-none
                                prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mb-2
                                prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1 prose-h2:text-primary
                                prose-p:text-foreground prose-p:text-sm prose-p:leading-relaxed
                                prose-strong:text-foreground prose-li:text-foreground prose-li:text-sm
                                prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            );
                          })()}
                          {msg.message_type === "report" && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                              <Button
                                onClick={() => handleDownload("pdf", msg.content, msg.workflow_title || "Report")}
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </Button>
                              <Button
                                onClick={() => handleDownload("docx", msg.content, msg.workflow_title || "Report")}
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                              >
                                <Download className="w-3 h-3" /> Word
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Live running indicator */}
            {status === "running" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%]">
                  <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">Thinking…</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${thinkingOpen ? "rotate-90" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-3 mt-1 space-y-2 border-l-2 border-primary/20 pl-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden w-48">
                          <motion.div
                            className="h-full rounded-full gradient-blue"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div
                          ref={logRef}
                          className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]"
                        >
                          {logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              {logTypeIcon(log.type)}
                              <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                              <span className="text-foreground">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    You can try again with a different prompt or workflow.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Bar */}
      {cronReport ? (
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Viewing scheduled report · {formatDateTime(cronReport.date)}
            </p>
            <Button onClick={onClearCronReport} variant="outline" size="sm" className="text-xs gap-1.5">
              Close
            </Button>
          </div>
        </div>
      ) : sessionId ? (
        <div className="shrink-0 border-t border-border bg-background px-3 md:px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
              {/* Workflow selector */}
              <div className="relative" ref={workflowPickerRef}>
                <button
                  onClick={() => setShowWorkflowPicker(!showWorkflowPicker)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedWorkflow
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <GitBranch className={`w-3.5 h-3.5 ${selectedWorkflow ? "text-primary" : ""}`} />
                  <span className="hidden sm:inline">{selectedWorkflow?.title || "Workflow"}</span>
                  <ChevronDown className={`w-3 h-3 ${selectedWorkflow ? "text-primary" : ""}`} />
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
                placeholder="Ask anything..."
                disabled={status === "running" || sendMessageMutation.isPending}
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-1.5 min-h-[36px] max-h-32"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={!selectedWorkflowId || !userPrompt.trim() || status === "running" || sendMessageMutation.isPending}
                size="icon"
                className="shrink-0 h-8 w-8 rounded-lg"
                title={!selectedWorkflowId ? "Select a workflow first" : ""}
              >
                {status === "running" || sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Powered by BGSW/BDO & BUD · Tarka
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

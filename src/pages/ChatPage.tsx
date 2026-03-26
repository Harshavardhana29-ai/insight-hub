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
import { useRecentSchedulerRuns } from "@/hooks/use-scheduler";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { generatePdfReport, generateWordReport } from "@/lib/pdf-export";

// ─── Scheduler mock history (static) ─────────────────────────────
const mockHistoryReports: Record<string, { title: string; date: string; workflow: string; report: string }> = {
  h2: {
    title: "Global Report on GCC",
    date: "Mar 25, 2026",
    workflow: "Market Research",
    report: `# Market Research\n\n\n\nHere is the strategic outlook for Bosch Global Software Technologies (BGSW):\n\n### **Executive Brief**\n\nBGSW's strategic imperative is to evolve its Indian GCC from a premier delivery center into a global innovation hub, capitalizing on the convergence of Agentic AI, Software-Defined Vehicles, and AI-driven cybersecurity to capture new revenue streams and drive Bosch's global growth.\n\n### **Leadership Impact Matrix**\n\n| Trend | Market Size/Growth (CAGR) | Impact on BGSW/Bosch | Source |\n| :--- | :--- | :--- | :--- |\n| **AI in Cybersecurity** | Global market to reach $93.75B by 2030. | New revenue stream from AI-powered security solutions for Bosch products and services. Potential to offer \"Security as a Service\". | McKinsey, BCG, Bain Analysis |\n| **AI Services & Agentic AI** | AI services market to reach $184.34B by 2029 (48.6% CAGR). | Shift from a service-provider to a \"Service as a Software\" model. Increased automation and efficiency in software development and business processes. | Deloitte, KPMG, PwC, a16z, MIT Sloan Analysis |\n| **Vehicle Personalization (SDVs)** | In-car technologies are now a primary consideration for car buyers. | Opportunity to lead in the development of software-defined vehicle platforms, creating new revenue from personalized services and features. | Accenture Strategy Analysis |\n| **India's Economic Growth & Software Play** | India is the 3rd largest startup ecosystem and a leading IT-BPM exporter. | BGSW's Indian GCC is perfectly positioned to become a global R&D and innovation hub, attracting top talent and driving product development. | World Bank, IMF, OECD Analysis |\n| **Future of Indian GCCs** | GCC market in India to reach $105B by 2030. | Opportunity for BGSW's Indian GCC to take on global leadership roles and end-to-end product ownership. | McKinsey, Bain Analysis |\n\n### **The \"So-What\" Analysis**\n\nThe confluence of rapid advancements in AI, particularly the shift towards agentic models, and the burgeoning software-defined vehicle market presents a pivotal moment for BGSW. This is not merely an incremental change but a fundamental rewiring of the technology landscape. The \"why\" is the market's demand for intelligent, personalized, and secure experiences, a demand that traditional business models cannot meet. The \"what\" is the opportunity for BGSW to leverage its deep engineering expertise to create new, high-margin revenue streams in AI-powered cybersecurity and personalized in-car experiences. The \"when\" is now, as the window to establish leadership in these nascent markets is closing. The \"so-what\" for BGSW is the urgent need to transition its Indian GCC from a cost-effective delivery center to a strategic innovation hub, empowered to lead global product development and business strategy. The \"what-if\" scenario of inaction is ceding ground to more agile, software-native competitors, relegating BGSW to a lower-margin, execution-only role in the future of mobility and technology. The challenge is not just technological; it is a necessary evolution of organizational structure, culture, and leadership to fully capitalize on this opportunity. The economic tailwinds in India, coupled with the strategic imperative for global enterprises to innovate from their GCCs, provide a unique and powerful launchpad for this transformation.\n\n### **Strategic Roadmap**\n\n#### **Key Findings:**\n\n*   **The AI Gold Rush is Here:** The market for AI services and AI-driven cybersecurity is expanding at an unprecedented rate. This is not a future trend; it is a current and actionable revenue opportunity.\n*   **The Car is a Computer:** The value proposition in the automotive industry is shifting from hardware to software. Vehicle personalization through software-defined platforms is the new competitive frontier.\n*   **India is the Innovation Engine:** BGSW's Indian GCC is its most critical asset in this new landscape. It has the talent, the ecosystem, and the potential to be the global leader for Bosch's software-led future.\n*   **Agentic AI is the Next Frontier:** The move from generative AI to agentic AI will unlock new business models, moving from selling tools to selling outcomes.\n*   **Diverse Economic Landscapes:** While India and Vietnam show robust growth, the more mature markets of Germany and Mexico are experiencing modest recoveries. Poland stands out with strong growth projections in the EU. This requires a nuanced regional strategy.\n\n#### **Action Plan:**\n\n*   **45-Day (Quick Wins/Pilots):**\n    *   Launch pilot projects within the Indian GCC focused on developing agentic AI solutions for internal process automation (e.g., code debugging, project management).\n    *   Initiate a \"Vehicle Personalization\" task force to prototype new in-car experiences and services on a simulated SDV platform.\n    *   Create a cross-functional team to develop a business case for an \"AI Cybersecurity\" offering, initially focused on securing Bosch's own products.\n\n*   **90-Day (Scaling/Process):**\n    *   Based on pilot results, scale successful agentic AI solutions across BGSW's global operations.\n    *   Formalize the \"AI Cybersecurity\" initiative, with a dedicated team and budget to develop a marketable product/service.\n    *   Begin a strategic review of the Indian GCC's organizational structure to identify and empower emerging leaders for global roles.\n\n*   **180-Day (Business Model Pivot):**\n    *   Launch the first version of the \"AI Cybersecurity\" service to a select group of Bosch's enterprise customers.\n    *   Begin the transition to a \"Service as a Software\" model for at least one of the successful agentic AI solutions, offering it as a subscription service.\n    *   Announce the elevation of the Indian GCC to a \"Global Innovation Hub,\" with new leadership roles and a mandate for end-to-end product ownership.\n\n#### **2028 Foresight & Org Design:**\n\n*   **Investment Decisions:** By 2028, a significant portion of BGSW's R&D budget will be allocated to AI-native product development, with a focus on agentic systems and AI-powered security. Investment in legacy systems and non-software-defined projects will be curtailed.\n*   **Board Directions:** The Bosch Global Board will increasingly look to BGSW's leadership in India for strategic direction on software-led innovation. The BGSW board will include members with deep expertise in AI and software-as-a-service business models.\n*   **Organizational Restructuring:** BGSW will evolve into a more decentralized, product-oriented organization. The Indian GCC will not be a \"center\" but a co-headquarters, with global product lines led from Bengaluru. The workforce will be upskilled, with a focus on AI/ML expertise, and the company will actively recruit from India's vibrant startup ecosystem.\n\n#### **GCC India Deep-Dive:**\n\nThe evolution of BGSW's Indian GCC is the linchpin of this entire strategy. The future of the GCC is not as a delivery hub but as a global strategic headquarters for software innovation. This means:\n\n*   **From Execution to Ownership:** The Indian GCC will move from executing on a roadmap defined elsewhere to owning the entire product lifecycle, from ideation and development to marketing and P&L.\n*   **Cultivating Global Leaders:** BGSW must proactively identify and groom a new generation of leaders from within its Indian operations, providing them with the autonomy and resources to lead global teams and initiatives.\n*   **Tapping into the Ecosystem:** The GCC must become an active participant in India's startup ecosystem, investing in promising new companies, and fostering a culture of open innovation.\n*   **A Beacon for Bosch:** The transformed Indian GCC will serve as a model for the rest of Bosch, demonstrating how to build an agile, software-first organization that can thrive in the age of AI.\n\n### **Evidence Vault**\n\n*   \"AI in Cybersecurity Revenue Opportunity\" - Based on analysis from McKinsey, BCG, and Bain.\n*   \"AI Services Market Projections\" - Based on data from Deloitte, KPMG, and PwC.\n*   \"The Rise of Agentic AI\" - Insights from Andreessen Horowitz and MIT Sloan.\n*   \"India's Digital Economy\" - Synthesized from reports by the World Bank, IMF, and OECD.\n*   \"The Future of the Automotive Industry\" - Based on Accenture Strategy's research on Software-Defined Vehicles.\n*   \"Bosch's Indian GCC\" - Information from Bosch's public statements and industry reports.\n*   \"The Future of GCCs in India\" - Based on reports from McKinsey and Bain.\n*   \"Global Economic Outlook\" - Based on forecasts from Deutsche Bank and Goldman Sachs.`,
  },
  h4: {
    title: "Weekly Market Report",
    date: "Mar 24, 2026",
    workflow: "Market Trend Analysis",
    report: `# Market Trend Analysis — Week of March 24, 2026\n\n## Market Overview\n\nAnalyzed **14 market sectors** with data synthesized from global financial news and market indicators (Bloomberg, Reuters, and IMF outlook updates).\n\n## Sector Performance\n\n| Sector | Weekly Change | Trend | Signal |\n|--------|:---:|:---:|:---:|\n| Technology | +3.1% | 📈 Bullish | Strong Buy |\n| Artificial Intelligence | +4.6% | 📈 Bullish | Strong Buy |\n| Energy (Oil & Gas) | +1.9% | 📈 Bullish | Buy |\n| Renewable Energy | +0.7% | ➡️ Neutral | Hold |\n| Healthcare | +0.9% | 📈 Bullish | Hold |\n| Finance | -0.4% | 📉 Bearish | Watch |\n| Consumer Goods | +1.5% | 📈 Bullish | Buy |\n| Industrials | +0.8% | ➡️ Neutral | Hold |\n| Real Estate | -1.2% | 📉 Bearish | Watch |\n| Telecommunications | +0.5% | ➡️ Neutral | Hold |\n| Materials | +0.3% | ➡️ Neutral | Hold |\n| Automotive (EV) | +2.2% | 📈 Bullish | Buy |\n| Semiconductors | +3.8% | 📈 Bullish | Strong Buy |\n| Crypto Market | +5.4% | 📈 Bullish | High Risk Buy |\n\n## Key Insights\n\n### AI & Semiconductor Surge\nDriven by **accelerated enterprise adoption of generative AI** and strong demand for advanced chips.\n- Major chipmakers reported **higher-than-expected guidance**\n- Data center expansion continues globally\n\n### Oil Market Rebound\n- Crude oil prices rose **~2% this week** amid supply tightening and OPEC+ production discipline\n- Geopolitical risks in key regions supported price stability\n\n### Tech Sector Strength\n- Continued momentum from **cloud computing and AI integration**\n- Large-cap tech firms led gains, especially in software and infrastructure\n\n### Real Estate Pressure\n- Rising bond yields weighed on property markets\n- Commercial real estate remains under stress in major economies\n\n## Risk Factors\n\n1. **Interest Rate Uncertainty** — Central banks signaling prolonged higher rates\n2. **Geopolitical Instability** — Ongoing tensions affecting oil supply routes\n3. **AI Regulation Risks** — Governments considering stricter AI governance frameworks\n4. **China Growth Concerns** — Slower industrial recovery impacting global demand\n\n## Outlook\n\n- AI, semiconductors, and tech expected to **outperform in near term**\n- Oil markets likely to remain **volatile but supported**\n- Defensive sectors may gain if macro uncertainty increases\n\n> *Next report scheduled: March 31, 2026*`,
  },
};

type RunStatus = "idle" | "running" | "completed" | "failed";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// renderHtmlForExport, stripMarkdown, formatTimestamp, loadImageAsDataUrl
// are now imported from @/lib/pdf-export



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
  const [showPreview] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workflowPickerRef = useRef<HTMLDivElement>(null);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const { toast } = useToast();

  const { data: workflowsData } = useWorkflows();
  const workflowsList = workflowsData?.items ?? [];
  const runMutation = useRunWorkflow();

  const isPolling = status === "running";
  const { data: runStatusData } = useRunStatus(runId, isPolling);
  const { data: runLogsData } = useRunLogs(runId, isPolling);
  const { data: reportData } = useRunReport(runId, status === "completed" && !report);

  const selectedWorkflow = workflowsList.find(w => w.id === selectedWorkflowId);

  const { data: recentRuns = [] } = useRecentSchedulerRuns();

  const historyReport = (() => {
    if (!selectedHistoryId) return null;
    if (mockHistoryReports[selectedHistoryId]) return mockHistoryReports[selectedHistoryId];
    if (selectedHistoryId.startsWith("sched-")) {
      const runId = selectedHistoryId.replace("sched-", "");
      const run = recentRuns.find(r => r.id === runId);
      if (run?.report_markdown) {
        return { title: run.job_name, date: run.run_date, workflow: run.workflow, report: run.report_markdown };
      }
    }
    return null;
  })();

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
                What do you want to know today?
              </p>

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

            {/* Running state - collapsible thinking */}
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
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${thinkingOpen ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-3 mt-1 space-y-2 border-l-2 border-primary/20 pl-3">
                        {/* Progress bar */}
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden w-48">
                          <motion.div
                            className="h-full rounded-full gradient-blue"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        {/* Logs */}
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
                  <Button onClick={resetRun} size="sm" variant="outline" className="mt-2 text-xs">
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Report display - inline like ChatGPT */}
            {displayReport && (status === "completed" || isShowingHistory) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isShowingHistory ? 0 : 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{displayTitle}</span>
                  {isShowingHistory && (
                    <Badge variant="secondary" className="text-[10px]">{historyReport?.date}</Badge>
                  )}
                </div>

                {/* Inline report - no card container */}
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

                {/* Download options at the bottom */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    onClick={() => handleDownload("pdf", displayReport, displayTitle)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="w-3 h-3" /> Download PDF
                  </Button>
                  <Button
                    onClick={() => handleDownload("docx", displayReport, displayTitle)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="w-3 h-3" /> Download Word
                  </Button>
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
                placeholder="Ask anything..."
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

    </div>
  );
}

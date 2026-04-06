import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Play, Pause, Edit, Calendar, Clock, ArrowLeft, Download,
  History, GitBranch, Bot, Search, ChevronLeft,
  ChevronRight, Check, X, Tag, Cpu, Send, ShieldAlert, Eye,
  Activity, AlertTriangle, Zap, Timer, FileText, Trash2,
} from "lucide-react";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { cronToHuman, validateCronExpression, getNextExecutions, CRON_PRESETS, TIMEZONES, DAY_NAMES, buildCron } from "@/lib/cron";
import { format } from "date-fns";
import type {
  CreateJobFormData, ScheduledJob, HistoryEntry, JobStatus,
  OutputDelivery, OutputFormat, WakeMode, ConcurrencyPolicy,
} from "@/types/cron";
import { useWorkflows } from "@/hooks/use-workflows";
import { useScheduledJobs, useJobHistory, useCreateJob, useUpdateJob, useDeleteJob, useToggleJob, formToPayload } from "@/hooks/use-scheduler";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/Pagination";
import { formatRelativeTime, formatDateTime } from "@/lib/format-time";

const SCHEDULER_PAGE_SIZE = 10;

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
    .replace(/^(?!<[huptblo])/gm, '')
    ;
}

const MOCK_USER = {
  name: "Krishna Prakash",
  email: "krishna.prakash@bosch.com",
};

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-bosch-green text-primary-foreground" },
  running: { label: "Running", className: "bg-bosch-yellow text-foreground" },
  failed: { label: "Failed", className: "bg-destructive text-primary-foreground" },
  paused: { label: "Paused", className: "bg-bosch-gray text-primary-foreground" },
};

const statusFilters: JobStatus[] = ["active", "running", "failed", "paused"];

// ─── Wizard Steps ────────────────────────────────────────────
const STEPS = [
  { label: "Identity", icon: Tag },
  { label: "Schedule", icon: Clock },
  { label: "Execution", icon: Cpu },
  { label: "Output", icon: Send },
  { label: "Failure", icon: ShieldAlert },
  { label: "Review", icon: Eye },
];

const DELAY_OPTIONS = [
  { value: "60", label: "60 seconds" },
  { value: "120", label: "120 seconds" },
  { value: "180", label: "180 seconds" },
  { value: "240", label: "240 seconds" },
  { value: "300", label: "300 seconds" },
];

const initialForm: CreateJobFormData = {
  name: "", userPrompt: "", workflowId: "", enabled: true,
  scheduleType: "recurring", cronExpression: "0 * * * *", oneTimeDate: "", timezone: "UTC",
  executionContext: { wakeMode: "next-heartbeat" },
  outputBehavior: {
    expectedOutputFormat: "markdown", outputSchema: "",
    deliveryMethods: ["internal-log"], storeStdout: true, storeStderr: true,
    retentionDays: 30, maxSizeKb: 10240, outlookEmail: MOCK_USER.email, teamsWebhook: MOCK_USER.email,
  },
  failureBehavior: {
    concurrency: "skip",
    retry: { enabled: false, maxAttempts: 3, delaySeconds: 60, backoff: "fixed" },
    autoDisableAfter: 0, escalationEnabled: false,
  },
};

// ─── Main Component ──────────────────────────────────────────
export default function SchedulingPage() {
  const { toast } = useToast();
  const { data: workflowsData } = useWorkflows();
  const workflowsList = useMemo(() => (workflowsData?.items ?? []).map(w => ({ id: w.id, title: w.title })), [workflowsData]);

  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editJob, setEditJob] = useState<ScheduledJob | null>(null);
  const [previewEntry, setPreviewEntry] = useState<HistoryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: jobsData } = useScheduledJobs({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    page,
    page_size: SCHEDULER_PAGE_SIZE,
  });
  const jobs = jobsData?.items ?? [];

  const toggleMutation = useToggleJob();
  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const deleteMutation = useDeleteJob();

  const filtered = jobs;

  const counts = useMemo(() => ({
    active: jobs.filter(j => j.status === "active").length,
    running: jobs.filter(j => j.status === "running").length,
    failed: jobs.filter(j => j.status === "failed").length,
    paused: jobs.filter(j => j.status === "paused").length,
  }), [jobs]);

  const toggleJob = (id: string) => {
    toggleMutation.mutate(id);
  };

  const handleSaveJob = async (form: CreateJobFormData) => {
    try {
      await createMutation.mutateAsync(formToPayload(form));
      setShowCreateWizard(false);
      toast({ title: "Schedule created successfully" });
    } catch {
      toast({ title: "Failed to create schedule", variant: "destructive" });
    }
  };

  const handleEditSave = async (form: CreateJobFormData) => {
    if (!editJob) return;
    try {
      await updateMutation.mutateAsync({ id: editJob.id, data: formToPayload(form) });
      setEditJob(null);
      toast({ title: "Schedule updated successfully" });
    } catch {
      toast({ title: "Failed to update schedule", variant: "destructive" });
    }
  };

  const deleteJob = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
      toast({ title: "Schedule deleted" });
    } catch {
      toast({ title: "Failed to delete schedule", variant: "destructive" });
    }
  };

  // ─── History View ────────────────────────────────────────
  const historyJob = historyJobId ? jobs.find((j) => j.id === historyJobId) : null;
  const { data: historyEntries = [] } = useJobHistory(historyJobId);

  if (historyJob) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
          <button onClick={() => setHistoryJobId(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Schedules
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-turquoise flex items-center justify-center shadow-sm">
              <History className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{historyJob.jobName} — History</h2>
              <p className="text-sm text-muted-foreground">Workflow: {historyJob.workflowTitle}</p>
            </div>
          </div>
          {historyEntries.length === 0 ? (
            <div className="bg-card border border-border rounded-md p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No history available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-md p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={entry.status} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatDateTime(entry.runDate)}</p>
                        <p className="text-xs text-muted-foreground">Duration: {entry.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewEntry(entry)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground mb-3">{entry.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {entry.workflow}</span>
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {entry.agents.join(", ")}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal — Rendered Markdown Report */}
        <Dialog open={!!previewEntry} onOpenChange={() => setPreviewEntry(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Report Preview — {formatDateTime(previewEntry?.runDate)}
              </DialogTitle>
            </DialogHeader>
            {previewEntry && (
              <div className="mt-2">
                {previewEntry.reportMarkdown ? (
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
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(previewEntry.reportMarkdown) }} />
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No report content available for this run.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Edit Wizard View ──────────────────────────────────
  if (editJob) {
    const editInitialForm: CreateJobFormData = {
      name: editJob.jobName,
      userPrompt: editJob.userPrompt || "",
      workflowId: editJob.workflowId,
      enabled: editJob.enabled,
      scheduleType: editJob.cronExpression ? "recurring" : "one-time",
      cronExpression: editJob.cronExpression || "0 * * * *",
      oneTimeDate: "",
      timezone: editJob.timezone || "UTC",
      executionContext: { wakeMode: editJob.wakeMode || "next-heartbeat" },
      outputBehavior: {
        expectedOutputFormat: editJob.outputFormat || "markdown",
        outputSchema: editJob.outputSchema || "",
        deliveryMethods: editJob.deliveryMethods || ["internal-log"],
        storeStdout: true, storeStderr: true, retentionDays: 30, maxSizeKb: 10240,
        outlookEmail: MOCK_USER.email, teamsWebhook: MOCK_USER.email,
      },
      failureBehavior: editJob.failureBehavior || initialForm.failureBehavior,
    };
    return <CreateScheduleWizard onSave={handleEditSave} onCancel={() => setEditJob(null)} initialData={editInitialForm} isEdit workflows={workflowsList} />;
  }

  // ─── Create Wizard View ──────────────────────────────────
  if (showCreateWizard) {
    return <CreateScheduleWizard onSave={handleSaveJob} onCancel={() => setShowCreateWizard(false)} workflows={workflowsList} />;
  }

  // ─── List View ───────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-colored">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Krishna's Scheduler</h2>
              <p className="text-sm text-muted-foreground">{jobs.filter((j) => j.enabled).length} active schedules</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateWizard(true)} className="gap-2 gradient-blue text-primary-foreground shadow-colored hover:opacity-90 border-0">
            <Plus className="w-4 h-4" /> Create Schedule
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active", value: counts.active, icon: Activity, color: "border-l-bosch-green", iconBg: "bg-bosch-green/10 text-bosch-green" },
            { label: "Running", value: counts.running, icon: Play, color: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
            { label: "Failed", value: counts.failed, icon: AlertTriangle, color: "border-l-destructive", iconBg: "bg-destructive/10 text-destructive" },
            { label: "Paused", value: counts.paused, icon: Pause, color: "border-l-bosch-gray", iconBg: "bg-bosch-gray/10 text-bosch-gray" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }} whileHover={{ y: -2, boxShadow: "0 8px 24px -8px hsl(220 20% 10% / 0.12)" }}>
              <Card className={`border-l-4 ${stat.color} rounded-md shadow-sm transition-all`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search jobs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"} size="sm"
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className={statusFilter === "all" ? "gradient-blue text-primary-foreground border-0" : ""}
            >All</Button>
            {statusFilters.map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(1); }}
                className={statusFilter === s ? "gradient-blue text-primary-foreground border-0" : ""}
              >{statusConfig[s].label}</Button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary bg-primary">
                  {["Job Name", "Type", "Schedule Time", "Next Run", "Last Run", "Jobs Done", "Status", "Actions"].map((h) => (
                    <th key={h} className={`text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((job, i) => (
                  <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-5 py-4">
                      <button onClick={() => setHistoryJobId(job.id)} className="text-sm font-semibold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
                        {job.jobName}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 bg-accent rounded-lg text-xs font-medium text-accent-foreground">{job.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> {job.type === "One-time" ? formatDateTime(job.scheduleTime) : job.scheduleTime}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{formatRelativeTime(job.nextRun)}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{formatRelativeTime(job.lastRun)}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-foreground">{job.jobsDone}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={cn("text-xs font-semibold", statusConfig[job.status]?.className)}>
                        {statusConfig[job.status]?.label || job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditJob(job)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleJob(job.id)} className={`p-2 rounded-lg transition-colors ${job.enabled ? "text-bosch-green hover:bg-bosch-green/10" : "text-muted-foreground hover:bg-accent"}`} title={job.enabled ? "Pause" : "Play"}>
                          {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setHistoryJobId(job.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="History">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(job.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">No jobs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {jobsData && (
            <Pagination
              page={jobsData.page}
              totalPages={jobsData.pages}
              total={jobsData.total}
              pageSize={jobsData.page_size}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Schedule
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this schedule? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-md">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteJob(deleteConfirm)} className="rounded-md">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Create/Edit Schedule Wizard ──────────────────────────────────
function CreateScheduleWizard({ onSave, onCancel, initialData, isEdit, workflows }: { onSave: (form: CreateJobFormData) => void; onCancel: () => void; initialData?: CreateJobFormData; isEdit?: boolean; workflows: Array<{ id: string; title: string }> }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateJobFormData>(initialData || initialForm);

  const update = <K extends keyof CreateJobFormData>(key: K, value: CreateJobFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateOutput = (patch: Partial<CreateJobFormData["outputBehavior"]>) => {
    setForm(prev => ({ ...prev, outputBehavior: { ...prev.outputBehavior, ...patch } }));
  };

  const updateFailure = (patch: Partial<CreateJobFormData["failureBehavior"]>) => {
    setForm(prev => ({ ...prev, failureBehavior: { ...prev.failureBehavior, ...patch } }));
  };

  const updateCtx = (patch: Partial<CreateJobFormData["executionContext"]>) => {
    setForm(prev => ({ ...prev, executionContext: { ...prev.executionContext, ...patch } }));
  };

  const cronValidation = validateCronExpression(form.cronExpression);
  const nextExecs = form.scheduleType === "recurring" ? getNextExecutions(form.cronExpression, 5) : [];

  // Build cron from preset + time
  const [selectedPreset, setSelectedPreset] = useState("everyday");
  const [cronHour, setCronHour] = useState("09");
  const [cronMinute, setCronMinute] = useState("00");
  const [cronDayOfWeek, setCronDayOfWeek] = useState("1");
  const [cronDayOfMonth, setCronDayOfMonth] = useState("1");

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const newCron = buildCron(presetKey, cronMinute, cronHour, cronDayOfWeek, cronDayOfMonth);
    update("cronExpression", newCron);
  };

  const handleTimeChange = (hour: string, minute: string, dow?: string, dom?: string) => {
    setCronHour(hour);
    setCronMinute(minute);
    if (dow !== undefined) setCronDayOfWeek(dow);
    if (dom !== undefined) setCronDayOfMonth(dom);
    const newCron = buildCron(selectedPreset, minute, hour, dow ?? cronDayOfWeek, dom ?? cronDayOfMonth);
    update("cronExpression", newCron);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length > 0 && form.workflowId !== "";
      case 1: return form.scheduleType === "one-time" ? !!form.oneTimeDate : cronValidation.valid;
      default: return true;
    }
  };

  const toggleDelivery = (method: OutputDelivery) => {
    if (method === "internal-log") return; // Dashboard is always enabled
    const methods = form.outputBehavior.deliveryMethods.includes(method)
      ? form.outputBehavior.deliveryMethods.filter(m => m !== method)
      : [...form.outputBehavior.deliveryMethods, method];
    updateOutput({ deliveryMethods: methods });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="max-w-3xl mx-auto w-full flex flex-col h-full p-6 pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shadow-colored", isEdit ? "bg-bosch-turquoise" : "gradient-blue")}>
            {isEdit ? <Edit className="w-5 h-5 text-primary-foreground" /> : <Timer className="w-5 h-5 text-primary-foreground" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{isEdit ? "Edit Schedule" : "Create Schedule"}</h2>
            <p className="text-sm text-muted-foreground">{isEdit ? "Modify your scheduled job configuration" : "Define a new scheduled job step by step"}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 overflow-x-auto pb-3">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                i === step ? "gradient-blue text-primary-foreground shadow-colored" :
                i < step ? "bg-bosch-green/10 text-bosch-green" :
                "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
              {s.label}
            </button>
          ))}
        </div>

        {/* Scrollable Step Content */}
        <Card className="shadow-sm rounded-md flex-1 min-h-0 overflow-hidden flex flex-col">
          <CardContent className="p-6 space-y-5 overflow-y-auto flex-1">
            <h3 className="text-base font-bold text-foreground">{STEPS[step].label}</h3>

            {/* Step 0: Identity */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Schedule Title *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Daily AI Briefing" />
                </div>
                <div className="space-y-2">
                  <Label>Workflow *</Label>
                  <Select value={form.workflowId} onValueChange={(v) => update("workflowId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a workflow…" /></SelectTrigger>
                    <SelectContent>
                      {workflows.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>User Prompt</Label>
                  <Textarea value={form.userPrompt} onChange={(e) => update("userPrompt", e.target.value)} placeholder="Describe what you want this job to accomplish…" rows={4} />
                </div>
                <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-accent/50">
                  <div>
                    <span className="text-sm font-medium text-foreground">Enable schedule</span>
                    <p className="text-xs text-muted-foreground">{form.enabled ? "Job will run on schedule" : "Job is disabled"}</p>
                  </div>
                  <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
                </div>
              </>
            )}

            {/* Step 1: Schedule — No editable cron, presets + time selection */}
            {step === 1 && (
              <>
                {form.scheduleType === "recurring" && cronValidation.valid && (
                  <div className="rounded-xl border-2 border-bosch-turquoise/30 bg-bosch-turquoise/5 p-4">
                    <p className="text-sm font-semibold text-bosch-turquoise">{cronToHuman(form.cronExpression)}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{form.cronExpression} • {form.timezone}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant={form.scheduleType === "recurring" ? "default" : "outline"} size="sm"
                    onClick={() => update("scheduleType", "recurring")}
                    className={form.scheduleType === "recurring" ? "gradient-blue text-primary-foreground border-0" : ""}
                  >Recurring</Button>
                  <Button
                    variant={form.scheduleType === "one-time" ? "default" : "outline"} size="sm"
                    onClick={() => update("scheduleType", "one-time")}
                    className={form.scheduleType === "one-time" ? "gradient-blue text-primary-foreground border-0" : ""}
                  >One-Time</Button>
                </div>
                {form.scheduleType === "recurring" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {CRON_PRESETS.map((p) => (
                          <Button key={p.key} variant={selectedPreset === p.key ? "default" : "outline"} size="sm"
                            className={cn("text-xs h-7", selectedPreset === p.key && "gradient-blue text-primary-foreground border-0")}
                            onClick={() => handlePresetChange(p.key)}
                          >{p.label}</Button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional time selection */}
                    {selectedPreset === "everymonth" && (
                      <div className="space-y-2">
                        <Label>Day of Month</Label>
                        <Select value={cronDayOfMonth} onValueChange={(v) => handleTimeChange(cronHour, cronMinute, undefined, v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedPreset === "everyweek" && (
                      <div className="space-y-2">
                        <Label>Day of Week</Label>
                        <Select value={cronDayOfWeek} onValueChange={(v) => handleTimeChange(cronHour, cronMinute, v, undefined)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAY_NAMES.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!["every5min", "every10min", "every30min"].includes(selectedPreset) && (
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <div className="flex items-center gap-2">
                          {/* Hour - shown for everyday, everyweek, everymonth */}
                          {selectedPreset !== "everyhour" && (
                            <>
                              <Select value={cronHour} onValueChange={(v) => handleTimeChange(v, cronMinute)}>
                                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-lg font-bold text-muted-foreground">:</span>
                            </>
                          )}
                          {/* Minute - shown for everyhour, everyday, everyweek, everymonth */}
                          <Select value={cronMinute} onValueChange={(v) => handleTimeChange(cronHour, v)}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPreset === "everyhour" && (
                            <span className="text-xs text-muted-foreground">minutes past the hour</span>
                          )}
                        </div>
                      </div>
                    )}

                    {["every5min", "every10min", "every30min"].includes(selectedPreset) && (
                      <div className="rounded-md border border-border bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Time selection is not needed for interval-based frequencies.</p>
                      </div>
                    )}

                    {cronValidation.valid && nextExecs.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Next 5 executions</Label>
                        <div className="bg-accent/50 rounded-xl p-3 space-y-1">
                          {nextExecs.map((d, i) => (
                            <div key={i} className="text-xs font-mono text-foreground">{format(d, "EEE, MMM d yyyy HH:mm")}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Execution Date & Time</Label>
                    <Input type="datetime-local" value={form.oneTimeDate} onChange={(e) => update("oneTimeDate", e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={form.timezone} onValueChange={(v) => update("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Execution (Wake Mode only) */}
            {step === 2 && (
              <div className="space-y-3">
                <Label>Wake Mode</Label>
                <RadioGroup value={form.executionContext.wakeMode} onValueChange={(v) => updateCtx({ wakeMode: v as WakeMode })}>
                  <div className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all", form.executionContext.wakeMode === "next-heartbeat" ? "border-primary bg-accent/50" : "border-border hover:border-primary/30")} onClick={() => updateCtx({ wakeMode: "next-heartbeat" })}>
                    <RadioGroupItem value="next-heartbeat" id="wake-hb" className="mt-0.5" />
                    <div>
                      <Label htmlFor="wake-hb" className="cursor-pointer font-semibold">Next Heartbeat</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Job queued and picked up on the agent's next heartbeat cycle. Lower resource impact.</p>
                    </div>
                  </div>
                  <div className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all", form.executionContext.wakeMode === "immediate" ? "border-primary bg-accent/50" : "border-border hover:border-primary/30")} onClick={() => updateCtx({ wakeMode: "immediate" })}>
                    <RadioGroupItem value="immediate" id="wake-imm" className="mt-0.5" />
                    <div>
                      <Label htmlFor="wake-imm" className="cursor-pointer font-semibold">Immediate Execution</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Agent wakes immediately to execute. Use for time-critical tasks.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Step 3: Output — simplified */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Expected Output Format</Label>
                  <Select
                    value={form.outputBehavior.expectedOutputFormat === "pdf" ? "markdown" : form.outputBehavior.expectedOutputFormat}
                    onValueChange={(v) => updateOutput({ expectedOutputFormat: v as OutputFormat })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="plain-text">Plain Text</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-accent/50">
                  <div>
                    <span className="text-sm font-medium text-foreground">Export as PDF</span>
                    <p className="text-xs text-muted-foreground">Also generate a PDF version of the output</p>
                  </div>
                  <Switch
                    checked={form.outputBehavior.expectedOutputFormat === "pdf"}
                    onCheckedChange={(v) => updateOutput({ expectedOutputFormat: v ? "pdf" : "markdown" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Output Schema (optional)</Label>
                  <Textarea value={form.outputBehavior.outputSchema} onChange={(e) => updateOutput({ outputSchema: e.target.value })} placeholder="Describe the expected output structure…" className="font-mono text-sm" rows={4} />
                  <p className="text-[11px] text-muted-foreground">Describe the expected structure so the output is parseable and usable.</p>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Methods</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "internal-log" as OutputDelivery, label: "Dashboard", locked: true },
                      { key: "outlook" as OutputDelivery, label: "Outlook", locked: false },
                      { key: "teams" as OutputDelivery, label: "Teams", locked: false },
                    ]).map((m) => (
                      <Button key={m.key}
                        variant={form.outputBehavior.deliveryMethods.includes(m.key) ? "default" : "outline"} size="sm"
                        onClick={() => toggleDelivery(m.key)}
                        disabled={m.locked}
                        className={cn(
                          form.outputBehavior.deliveryMethods.includes(m.key) ? "gradient-blue text-primary-foreground border-0" : "",
                          m.locked && "opacity-80 cursor-not-allowed"
                        )}
                      >{m.label}</Button>
                    ))}
                  </div>
                </div>
                {form.outputBehavior.deliveryMethods.includes("outlook") && (
                  <div className="space-y-2">
                    <Label>Outlook Email</Label>
                    <Input value={MOCK_USER.email} disabled className="bg-muted/50 cursor-not-allowed" />
                    <p className="text-[11px] text-muted-foreground">Auto-filled from your profile</p>
                  </div>
                )}
                {form.outputBehavior.deliveryMethods.includes("teams") && (
                  <div className="space-y-2">
                    <Label>Teams Email</Label>
                    <Input value={MOCK_USER.email} disabled className="bg-muted/50 cursor-not-allowed" />
                    <p className="text-[11px] text-muted-foreground">Auto-filled from your profile</p>
                  </div>
                )}
              </>
            )}

            {/* Step 4: Failure — no backoff, no escalation, dropdown for delay & attempts */}
            {step === 4 && (
              <>
                <div className="space-y-2">
                  <Label>Concurrency Policy</Label>
                  <Select value={form.failureBehavior.concurrency} onValueChange={(v) => updateFailure({ concurrency: v as ConcurrencyPolicy })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow overlapping runs</SelectItem>
                      <SelectItem value="skip">Skip if already running</SelectItem>
                      <SelectItem value="queue">Queue for later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/50">
                    <span className="text-sm font-medium text-foreground">Enable Retries</span>
                    <Switch checked={form.failureBehavior.retry.enabled} onCheckedChange={(v) => updateFailure({ retry: { ...form.failureBehavior.retry, enabled: v } })} />
                  </div>
                  {form.failureBehavior.retry.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Max Attempts</Label>
                        <Select value={String(form.failureBehavior.retry.maxAttempts)} onValueChange={(v) => updateFailure({ retry: { ...form.failureBehavior.retry, maxAttempts: parseInt(v) } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Delay</Label>
                        <Select value={String(form.failureBehavior.retry.delaySeconds)} onValueChange={(v) => updateFailure({ retry: { ...form.failureBehavior.retry, delaySeconds: parseInt(v) } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DELAY_OPTIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label>Auto-disable(stop) the job after N consecutive Failures (0 = disabled)</Label>
                  <Input type="number" value={form.failureBehavior.autoDisableAfter} onChange={(e) => updateFailure({ autoDisableAfter: parseInt(e.target.value) || 0 })} />
                </div>
              </>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Identity", items: [
                      { k: "Name", v: form.name || "—" },
                      { k: "Workflow", v: workflows.find(w => w.id === form.workflowId)?.title || "—" },
                      { k: "Enabled", v: form.enabled ? "Yes" : "No" },
                    ]},
                    { title: "Schedule", items: [
                      { k: "", v: form.scheduleType === "recurring" ? cronToHuman(form.cronExpression) : `One-time: ${form.oneTimeDate}` },
                      { k: "Timezone", v: form.timezone },
                    ]},
                    { title: "Execution", items: [
                      { k: "Wake", v: form.executionContext.wakeMode.replace("-", " ") },
                    ]},
                    { title: "Output", items: [
                      { k: "Format", v: form.outputBehavior.expectedOutputFormat },
                      { k: "Delivery", v: form.outputBehavior.deliveryMethods.join(", ") },
                    ]},
                  ].map((section) => (
                    <div key={section.title} className="p-4 rounded-md bg-accent/30 border border-border">
                      <h4 className="text-sm font-bold text-foreground mb-2">{section.title}</h4>
                      {section.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.k ? <>{item.k}: <span className="text-foreground font-medium">{item.v}</span></> : <span className="text-foreground font-medium">{item.v}</span>}
                        </p>
                      ))}
                    </div>
                  ))}
                  <div className="p-4 rounded-md bg-accent/30 border border-border md:col-span-2">
                    <h4 className="text-sm font-bold text-foreground mb-2">Failure</h4>
                    <p className="text-sm text-muted-foreground">Concurrency: <span className="text-foreground font-medium">{form.failureBehavior.concurrency}</span></p>
                    <p className="text-sm text-muted-foreground">Retries: <span className="text-foreground font-medium">{form.failureBehavior.retry.enabled ? `${form.failureBehavior.retry.maxAttempts} attempts, ${form.failureBehavior.retry.delaySeconds}s delay` : "Disabled"}</span></p>
                  </div>
                </div>
                {form.userPrompt && (
                  <div className="p-4 rounded-md bg-bosch-purple/5 border border-bosch-purple/20">
                    <h4 className="text-sm font-bold text-foreground mb-1">User Prompt</h4>
                    <p className="text-sm text-muted-foreground">{form.userPrompt}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fixed Navigation */}
        <div className="flex justify-between py-4 border-t border-border bg-background">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onCancel()} className="rounded-md">
            <ChevronLeft className="w-4 h-4 mr-1" /> {step > 0 ? "Back" : "Cancel"}
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gradient-blue text-primary-foreground border-0 shadow-colored hover:opacity-90 rounded-md">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => onSave(form)} className="gradient-green text-primary-foreground border-0 shadow-sm hover:opacity-90 rounded-md">
              <Check className="w-4 h-4 mr-1" /> {isEdit ? "Update Job" : "Save Job"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Play, Pause, Edit, Calendar, Clock, ArrowLeft, Download,
  Bell, BellOff, History, GitBranch, Bot, Search, ChevronLeft,
  ChevronRight, Check, X, Tag, Cpu, Send, ShieldAlert, Eye,
  Activity, AlertTriangle, Zap, Timer,
} from "lucide-react";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { cronToHuman, validateCronExpression, getNextExecutions, CRON_PRESETS, TIMEZONES } from "@/lib/cron";
import { format } from "date-fns";
import type {
  CreateJobFormData, ScheduledJob, HistoryEntry, JobStatus,
  OutputDelivery, OutputFormat, WakeMode, ConcurrencyPolicy,
  BackoffStrategy, EscalationChannel,
} from "@/types/cron";

// ─── Mock Data ───────────────────────────────────────────────
const mockWorkflows = [
  { id: "1", title: "AI News Digest" },
  { id: "2", title: "Market Trend Analysis" },
  { id: "3", title: "Tech Industry Monitor" },
  { id: "4", title: "Sports Analytics Weekly" },
];

const initialJobs: ScheduledJob[] = [
  { id: "1", jobName: "Daily AI Briefing", type: "Daily", workflowId: "1", workflowTitle: "AI News Digest", scheduleTime: "09:00", nextRun: "Tomorrow 09:00", lastRun: "Today 09:00", status: "active", notify: true, enabled: true },
  { id: "2", jobName: "Weekly Market Report", type: "Weekly", workflowId: "2", workflowTitle: "Market Trend Analysis", scheduleTime: "Mon 08:00", nextRun: "Mar 18", lastRun: "Mar 11", status: "active", notify: true, enabled: true },
  { id: "3", jobName: "Monthly Finance Summary", type: "Monthly", workflowId: "2", workflowTitle: "Market Trend Analysis", scheduleTime: "1st 10:00", nextRun: "Apr 1", lastRun: "Mar 1", status: "active", notify: false, enabled: true },
  { id: "4", jobName: "Sports Update Evening", type: "Daily", workflowId: "4", workflowTitle: "Sports Analytics Weekly", scheduleTime: "18:00", nextRun: "—", lastRun: "Mar 10", status: "paused", notify: false, enabled: false },
  { id: "5", jobName: "Tech Trends Friday", type: "Weekly", workflowId: "3", workflowTitle: "Tech Industry Monitor", scheduleTime: "Fri 14:00", nextRun: "Mar 15", lastRun: "Mar 8", status: "active", notify: true, enabled: true },
];

const mockHistory: Record<string, HistoryEntry[]> = {
  "1": [
    { id: "h1", runDate: "2024-03-12 09:00", status: "Completed", duration: "2m 34s", workflow: "AI News Digest", agents: ["News Aggregator", "Sentiment Analyzer"], description: "Collected 47 articles, generated sentiment report" },
    { id: "h2", runDate: "2024-03-11 09:00", status: "Completed", duration: "2m 12s", workflow: "AI News Digest", agents: ["News Aggregator", "Sentiment Analyzer"], description: "Collected 52 articles, generated sentiment report" },
    { id: "h3", runDate: "2024-03-10 09:00", status: "Error", duration: "0m 45s", workflow: "AI News Digest", agents: ["News Aggregator"], description: "API rate limit exceeded, partial data collected" },
  ],
  "2": [
    { id: "h4", runDate: "2024-03-11 08:00", status: "Completed", duration: "5m 10s", workflow: "Market Trend Analysis", agents: ["Trend Detector", "Report Generator"], description: "Analyzed 12 market sectors, generated weekly trend report" },
  ],
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

const initialForm: CreateJobFormData = {
  name: "", userPrompt: "", workflowId: "", enabled: true,
  scheduleType: "recurring", cronExpression: "0 * * * *", oneTimeDate: "", timezone: "UTC",
  executionContext: { wakeMode: "next-heartbeat" },
  outputBehavior: {
    expectedOutputFormat: "markdown", outputSchema: "",
    deliveryMethods: ["internal-log"], storeStdout: true, storeStderr: true,
    retentionDays: 30, maxSizeKb: 10240, outlookEmail: "", teamsWebhook: "",
  },
  failureBehavior: {
    concurrency: "skip",
    retry: { enabled: false, maxAttempts: 3, delaySeconds: 60, backoff: "fixed" },
    autoDisableAfter: 0, escalationEnabled: false,
  },
};

// ─── Main Component ──────────────────────────────────────────
export default function SchedulingPage() {
  const [jobs, setJobs] = useState(initialJobs);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (search && !j.jobName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [jobs, search, statusFilter]);

  const counts = useMemo(() => ({
    active: jobs.filter(j => j.status === "active").length,
    running: jobs.filter(j => j.status === "running").length,
    failed: jobs.filter(j => j.status === "failed").length,
    paused: jobs.filter(j => j.status === "paused").length,
  }), [jobs]);

  const toggleJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, enabled: !j.enabled, status: (j.enabled ? "paused" : "active") as JobStatus }
          : j
      )
    );
  };

  const toggleNotify = (id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, notify: !j.notify } : j)));
  };

  const handleSaveJob = (form: CreateJobFormData) => {
    const wf = mockWorkflows.find(w => w.id === form.workflowId);
    const newJob: ScheduledJob = {
      id: String(Date.now()),
      jobName: form.name,
      type: form.scheduleType === "recurring" ? cronToHuman(form.cronExpression).split(" ")[0] : "One-time",
      workflowId: form.workflowId,
      workflowTitle: wf?.title || "—",
      scheduleTime: form.scheduleType === "recurring" ? form.cronExpression : form.oneTimeDate,
      nextRun: "Pending",
      lastRun: "—",
      status: form.enabled ? "active" : "paused",
      notify: form.outputBehavior.deliveryMethods.includes("outlook") || form.outputBehavior.deliveryMethods.includes("teams"),
      enabled: form.enabled,
      userPrompt: form.userPrompt,
      cronExpression: form.cronExpression,
      timezone: form.timezone,
      wakeMode: form.executionContext.wakeMode,
      outputFormat: form.outputBehavior.expectedOutputFormat,
      deliveryMethods: form.outputBehavior.deliveryMethods,
      failureBehavior: form.failureBehavior,
    };
    setJobs(prev => [newJob, ...prev]);
    setShowCreateWizard(false);
  };

  // ─── History View ────────────────────────────────────────
  const historyJob = historyJobId ? jobs.find((j) => j.id === historyJobId) : null;
  const historyEntries = historyJobId ? mockHistory[historyJobId] || [] : [];

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
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No history available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={entry.status} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{entry.runDate}</p>
                        <p className="text-xs text-muted-foreground">Duration: {entry.duration}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
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
      </div>
    );
  }

  // ─── Create Wizard View ──────────────────────────────────
  if (showCreateWizard) {
    return <CreateScheduleWizard onSave={handleSaveJob} onCancel={() => setShowCreateWizard(false)} />;
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
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`border-l-4 ${stat.color} rounded-md shadow-sm hover:shadow-md transition-all`}>
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
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "gradient-blue text-primary-foreground border-0" : ""}
            >
              All
            </Button>
            {statusFilters.map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "gradient-blue text-primary-foreground border-0" : ""}
              >
                {statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Job Name", "Type", "Schedule Time", "Next Run", "Last Run", "Status", "Notify", "Actions"].map((h) => (
                    <th key={h} className={`text-xs font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}>
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
                        <Clock className="w-3.5 h-3.5" /> {job.scheduleTime}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.nextRun}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.lastRun}</td>
                    <td className="px-5 py-4">
                      <Badge className={cn("text-xs font-semibold", statusConfig[job.status]?.className)}>
                        {statusConfig[job.status]?.label || job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleNotify(job.id)} className={`p-1.5 rounded-lg transition-colors ${job.notify ? "text-primary hover:bg-accent" : "text-muted-foreground hover:bg-accent"}`}>
                        {job.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleJob(job.id)} className={`p-2 rounded-lg transition-colors ${job.enabled ? "text-bosch-green hover:bg-bosch-green/10" : "text-muted-foreground hover:bg-accent"}`} title={job.enabled ? "Pause" : "Play"}>
                          {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setHistoryJobId(job.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="History">
                          <History className="w-4 h-4" />
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
        </div>
      </div>
    </div>
  );
}

// ─── Create Schedule Wizard ──────────────────────────────────
function CreateScheduleWizard({ onSave, onCancel }: { onSave: (form: CreateJobFormData) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateJobFormData>(initialForm);

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

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length > 0 && form.workflowId !== "";
      case 1: return form.scheduleType === "one-time" ? !!form.oneTimeDate : cronValidation.valid;
      default: return true;
    }
  };

  const toggleDelivery = (method: OutputDelivery) => {
    const methods = form.outputBehavior.deliveryMethods.includes(method)
      ? form.outputBehavior.deliveryMethods.filter(m => m !== method)
      : [...form.outputBehavior.deliveryMethods, method];
    updateOutput({ deliveryMethods: methods });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-colored">
            <Timer className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Schedule</h2>
            <p className="text-sm text-muted-foreground">Define a new scheduled job step by step</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
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

        {/* Step Content */}
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-5">
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
                      {mockWorkflows.map((w) => (
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

            {/* Step 1: Schedule */}
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
                  >
                    Recurring (Cron)
                  </Button>
                  <Button
                    variant={form.scheduleType === "one-time" ? "default" : "outline"} size="sm"
                    onClick={() => update("scheduleType", "one-time")}
                    className={form.scheduleType === "one-time" ? "gradient-blue text-primary-foreground border-0" : ""}
                  >
                    One-Time
                  </Button>
                </div>
                {form.scheduleType === "recurring" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <Input value={form.cronExpression} onChange={(e) => update("cronExpression", e.target.value)} placeholder="* * * * *" className={cn("font-mono text-sm", !cronValidation.valid && form.cronExpression && "border-destructive")} />
                      {form.cronExpression && !cronValidation.valid && (
                        <div className="text-xs text-destructive">{cronValidation.errors.join(", ")}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Presets</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {CRON_PRESETS.map((p) => (
                          <Button key={p.expression} variant={form.cronExpression === p.expression ? "default" : "outline"} size="sm" className={cn("text-xs h-7", form.cronExpression === p.expression && "gradient-blue text-primary-foreground border-0")} onClick={() => update("cronExpression", p.expression)}>
                            {p.label}
                          </Button>
                        ))}
                      </div>
                    </div>
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

            {/* Step 3: Output */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Expected Output Format</Label>
                  <Select value={form.outputBehavior.expectedOutputFormat} onValueChange={(v) => updateOutput({ expectedOutputFormat: v as OutputFormat })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="plain-text">Plain Text</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
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
                      { key: "internal-log" as OutputDelivery, label: "Dashboard" },
                      { key: "outlook" as OutputDelivery, label: "Outlook" },
                      { key: "teams" as OutputDelivery, label: "Teams" },
                    ]).map((m) => (
                      <Button key={m.key}
                        variant={form.outputBehavior.deliveryMethods.includes(m.key) ? "default" : "outline"} size="sm"
                        onClick={() => toggleDelivery(m.key)}
                        className={form.outputBehavior.deliveryMethods.includes(m.key) ? "gradient-blue text-primary-foreground border-0" : ""}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {form.outputBehavior.deliveryMethods.includes("outlook") && (
                  <div className="space-y-2">
                    <Label>Outlook Email</Label>
                    <Input value={form.outputBehavior.outlookEmail} onChange={(e) => updateOutput({ outlookEmail: e.target.value })} placeholder="user@company.com" />
                  </div>
                )}
                {form.outputBehavior.deliveryMethods.includes("teams") && (
                  <div className="space-y-2">
                    <Label>Teams Webhook URL</Label>
                    <Input value={form.outputBehavior.teamsWebhook} onChange={(e) => updateOutput({ teamsWebhook: e.target.value })} placeholder="https://outlook.office.com/webhook/..." className="font-mono text-sm" />
                  </div>
                )}
                {form.outputBehavior.deliveryMethods.includes("internal-log") && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold text-foreground">Log Storage</p>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/50">
                      <span className="text-sm text-muted-foreground">Store stdout</span>
                      <Switch checked={form.outputBehavior.storeStdout} onCheckedChange={(v) => updateOutput({ storeStdout: v })} />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/50">
                      <span className="text-sm text-muted-foreground">Store stderr</span>
                      <Switch checked={form.outputBehavior.storeStderr} onCheckedChange={(v) => updateOutput({ storeStderr: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Retention (days)</Label>
                        <Input type="number" value={form.outputBehavior.retentionDays} onChange={(e) => updateOutput({ retentionDays: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Size (KB)</Label>
                        <Input type="number" value={form.outputBehavior.maxSizeKb} onChange={(e) => updateOutput({ maxSizeKb: parseInt(e.target.value) || 1 })} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 4: Failure */}
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Max Attempts</Label>
                        <Input type="number" value={form.failureBehavior.retry.maxAttempts} onChange={(e) => updateFailure({ retry: { ...form.failureBehavior.retry, maxAttempts: parseInt(e.target.value) || 1 } })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Delay (sec)</Label>
                        <Input type="number" value={form.failureBehavior.retry.delaySeconds} onChange={(e) => updateFailure({ retry: { ...form.failureBehavior.retry, delaySeconds: parseInt(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Backoff</Label>
                        <Select value={form.failureBehavior.retry.backoff} onValueChange={(v) => updateFailure({ retry: { ...form.failureBehavior.retry, backoff: v as BackoffStrategy } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="exponential">Exponential</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/50">
                    <span className="text-sm font-medium text-foreground">Escalate after all retries fail</span>
                    <Switch checked={form.failureBehavior.escalationEnabled} onCheckedChange={(v) => updateFailure({ escalationEnabled: v })} />
                  </div>
                  {form.failureBehavior.escalationEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Channel</Label>
                        <Select value={form.failureBehavior.escalationChannel || ""} onValueChange={(v) => updateFailure({ escalationChannel: v as EscalationChannel })}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="in-app">In-App</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contact</Label>
                        <Input value={form.failureBehavior.escalationContact || ""} onChange={(e) => updateFailure({ escalationContact: e.target.value })} placeholder="oncall@company.com" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label>Auto-disable after N consecutive failures (0 = disabled)</Label>
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
                      { k: "Workflow", v: mockWorkflows.find(w => w.id === form.workflowId)?.title || "—" },
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
                    <div key={section.title} className="p-4 rounded-xl bg-accent/30 border border-border">
                      <h4 className="text-sm font-bold text-foreground mb-2">{section.title}</h4>
                      {section.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.k ? <>{item.k}: <span className="text-foreground font-medium">{item.v}</span></> : <span className="text-foreground font-medium">{item.v}</span>}
                        </p>
                      ))}
                    </div>
                  ))}
                  <div className="p-4 rounded-xl bg-accent/30 border border-border md:col-span-2">
                    <h4 className="text-sm font-bold text-foreground mb-2">Failure</h4>
                    <p className="text-sm text-muted-foreground">Concurrency: <span className="text-foreground font-medium">{form.failureBehavior.concurrency}</span></p>
                    <p className="text-sm text-muted-foreground">Retries: <span className="text-foreground font-medium">{form.failureBehavior.retry.enabled ? `${form.failureBehavior.retry.maxAttempts} attempts, ${form.failureBehavior.retry.backoff}` : "Disabled"}</span></p>
                    {form.failureBehavior.escalationEnabled && (
                      <p className="text-sm text-muted-foreground">Escalation: <span className="text-foreground font-medium">{form.failureBehavior.escalationChannel}</span></p>
                    )}
                  </div>
                </div>
                {form.userPrompt && (
                  <div className="p-4 rounded-xl bg-bosch-purple/5 border border-bosch-purple/20">
                    <h4 className="text-sm font-bold text-foreground mb-1">User Prompt</h4>
                    <p className="text-sm text-muted-foreground">{form.userPrompt}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onCancel()}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {step > 0 ? "Back" : "Cancel"}
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gradient-blue text-primary-foreground border-0 shadow-colored hover:opacity-90">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => onSave(form)} className="gradient-green text-primary-foreground border-0 shadow-sm hover:opacity-90">
              <Check className="w-4 h-4 mr-1" /> Save Job
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

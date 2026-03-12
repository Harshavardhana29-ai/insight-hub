import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  Pause,
  Edit,
  Calendar,
  Clock,
  ArrowLeft,
  Download,
  Bell,
  BellOff,
  History,
  GitBranch,
  Bot,
} from "lucide-react";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScheduledJob {
  id: string;
  jobName: string;
  type: string;
  workflowId: string;
  workflowTitle: string;
  scheduleTime: string;
  nextRun: string;
  lastRun: string;
  status: string;
  notify: boolean;
  enabled: boolean;
}

interface HistoryEntry {
  id: string;
  runDate: string;
  status: string;
  duration: string;
  workflow: string;
  agents: string[];
  description: string;
}

const mockWorkflows = [
  { id: "1", title: "AI News Digest" },
  { id: "2", title: "Market Trend Analysis" },
  { id: "3", title: "Tech Industry Monitor" },
  { id: "4", title: "Sports Analytics Weekly" },
];

const mockJobs: ScheduledJob[] = [
  { id: "1", jobName: "Daily AI Briefing", type: "Daily", workflowId: "1", workflowTitle: "AI News Digest", scheduleTime: "09:00", nextRun: "Tomorrow 09:00", lastRun: "Today 09:00", status: "Active", notify: true, enabled: true },
  { id: "2", jobName: "Weekly Market Report", type: "Weekly", workflowId: "2", workflowTitle: "Market Trend Analysis", scheduleTime: "Mon 08:00", nextRun: "Mar 18", lastRun: "Mar 11", status: "Active", notify: true, enabled: true },
  { id: "3", jobName: "Monthly Finance Summary", type: "Monthly", workflowId: "2", workflowTitle: "Market Trend Analysis", scheduleTime: "1st 10:00", nextRun: "Apr 1", lastRun: "Mar 1", status: "Scheduled", notify: false, enabled: true },
  { id: "4", jobName: "Sports Update Evening", type: "Daily", workflowId: "4", workflowTitle: "Sports Analytics Weekly", scheduleTime: "18:00", nextRun: "—", lastRun: "Mar 10", status: "Paused", notify: false, enabled: false },
  { id: "5", jobName: "Tech Trends Friday", type: "Weekly", workflowId: "3", workflowTitle: "Tech Industry Monitor", scheduleTime: "Fri 14:00", nextRun: "Mar 15", lastRun: "Mar 8", status: "Active", notify: true, enabled: true },
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

export default function SchedulingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobs, setJobs] = useState(mockJobs);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);

  const toggleJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, enabled: !j.enabled, status: j.enabled ? "Paused" : "Active" }
          : j
      )
    );
  };

  const toggleNotify = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, notify: !j.notify } : j))
    );
  };

  const historyJob = historyJobId ? jobs.find((j) => j.id === historyJobId) : null;
  const historyEntries = historyJobId ? mockHistory[historyJobId] || [] : [];

  if (historyJob) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
          {/* Back button */}
          <button
            onClick={() => setHistoryJobId(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedules
          </button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{historyJob.jobName} — History</h2>
                <p className="text-sm text-muted-foreground">Workflow: {historyJob.workflowTitle}</p>
              </div>
            </div>
          </div>

          {/* History entries */}
          {historyEntries.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No history available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={entry.status} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{entry.runDate}</p>
                        <p className="text-xs text-muted-foreground">Duration: {entry.duration}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                  <p className="text-sm text-foreground mb-3">{entry.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" /> {entry.workflow}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3" /> {entry.agents.join(", ")}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Krishna's Scheduler</h2>
              <p className="text-sm text-muted-foreground">{jobs.filter((j) => j.enabled).length} active schedules</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Job Name", "Type", "Schedule Time", "Next Run", "Last Run", "Status", "Notify", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`text-xs font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wide ${
                        h === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setHistoryJobId(job.id)}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                      >
                        {job.jobName}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {job.scheduleTime}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.nextRun}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.lastRun}</td>
                    <td className="px-5 py-4"><StatusIndicator status={job.status} /></td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleNotify(job.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          job.notify ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {job.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleJob(job.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            job.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-accent"
                          }`}
                          title={job.enabled ? "Pause" : "Play"}
                        >
                          {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setHistoryJobId(job.id)}
                          className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                          title="History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <FormField label="Schedule Title">
              <input
                type="text"
                placeholder="e.g. Daily AI Briefing"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
            <FormField label="Workflow">
              <select className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a workflow…</option>
                {mockWorkflows.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Frequency">
              <select className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>One-time</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </FormField>
            <FormField label="Time">
              <input
                type="time"
                defaultValue="09:00"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">Enable schedule</span>
              <button className="w-11 h-6 bg-primary rounded-full relative transition-colors">
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full transition-transform" />
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">Notify on completion</span>
              <button className="w-11 h-6 bg-primary rounded-full relative transition-colors">
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full transition-transform" />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
            >
              Cancel
            </button>
            <button className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold shadow-sm">
              Create
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

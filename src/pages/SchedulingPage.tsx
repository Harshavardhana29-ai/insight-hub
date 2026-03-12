import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Clock,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScheduledJob {
  id: string;
  workflow: string;
  agent: string;
  topic: string;
  schedule: string;
  status: string;
  lastRun: string;
  nextRun: string;
  enabled: boolean;
}

const mockJobs: ScheduledJob[] = [
  { id: "1", workflow: "Market Trend Analysis", agent: "MRA-Primary", topic: "AI", schedule: "Daily 09:00", status: "Active", lastRun: "Today 09:00", nextRun: "Tomorrow 09:00", enabled: true },
  { id: "2", workflow: "Competitor Monitoring", agent: "MRA-Secondary", topic: "Technology", schedule: "Weekly Mon", status: "Active", lastRun: "Mar 11", nextRun: "Mar 18", enabled: true },
  { id: "3", workflow: "Financial Report Digest", agent: "MRA-Primary", topic: "Finance", schedule: "Monthly 1st", status: "Scheduled", lastRun: "Mar 1", nextRun: "Apr 1", enabled: true },
  { id: "4", workflow: "Sports Analytics Update", agent: "MRA-Sports", topic: "Sports", schedule: "Daily 18:00", status: "Paused", lastRun: "Mar 10", nextRun: "—", enabled: false },
  { id: "5", workflow: "Industry Newsletter", agent: "MRA-Primary", topic: "General", schedule: "Weekly Fri", status: "Completed", lastRun: "Mar 8", nextRun: "Mar 15", enabled: true },
];

export default function SchedulingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobs, setJobs] = useState(mockJobs);

  const toggleJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, enabled: !j.enabled, status: j.enabled ? "Paused" : "Active" }
          : j
      )
    );
  };

  return (
    <>
      <AppHeader title="Scheduling" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{jobs.filter((j) => j.enabled).length} active workflows</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Schedule
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Workflow", "Agent", "Topic", "Schedule", "Status", "Last Run", "Next Run", "Actions"].map((h) => (
                      <th key={h} className={`text-xs font-medium text-muted-foreground px-4 py-3 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{job.workflow}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{job.agent}</td>
                      <td className="px-4 py-3"><TopicBadge topic={job.topic} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {job.schedule}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusIndicator status={job.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{job.lastRun}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{job.nextRun}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleJob(job.id)}
                            className={`p-1.5 rounded-md transition-colors ${job.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-accent"}`}
                          >
                            {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <FormField label="Workflow">
              <select className="w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Market Trend Analysis</option>
                <option>Competitor Monitoring</option>
                <option>Financial Report Digest</option>
                <option>Industry Newsletter</option>
              </select>
            </FormField>
            <FormField label="Agent">
              <select className="w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>MRA-Primary</option>
                <option>MRA-Secondary</option>
                <option>MRA-Sports</option>
              </select>
            </FormField>
            <FormField label="Topic">
              <select className="w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>AI</option>
                <option>Sports</option>
                <option>Finance</option>
                <option>Technology</option>
                <option>General</option>
              </select>
            </FormField>
            <FormField label="Frequency">
              <select className="w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>One-time</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </FormField>
            <FormField label="Time">
              <input type="time" defaultValue="09:00" className="w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            </FormField>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">Enable schedule</span>
              <button className="w-10 h-6 bg-primary rounded-full relative transition-colors">
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full transition-transform" />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-muted-foreground">Cancel</button>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Create</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

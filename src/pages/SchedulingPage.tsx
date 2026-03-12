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
  topic: string;
  schedule: string;
  status: string;
  lastRun: string;
  nextRun: string;
  enabled: boolean;
}

const mockJobs: ScheduledJob[] = [
  { id: "1", topic: "AI", schedule: "Daily 09:00", status: "Active", lastRun: "Today 09:00", nextRun: "Tomorrow 09:00", enabled: true },
  { id: "2", topic: "Technology", schedule: "Weekly Mon", status: "Active", lastRun: "Mar 11", nextRun: "Mar 18", enabled: true },
  { id: "3", topic: "Finance", schedule: "Monthly 1st", status: "Scheduled", lastRun: "Mar 1", nextRun: "Apr 1", enabled: true },
  { id: "4", topic: "Sports", schedule: "Daily 18:00", status: "Paused", lastRun: "Mar 10", nextRun: "—", enabled: false },
  { id: "5", topic: "General", schedule: "Weekly Fri", status: "Completed", lastRun: "Mar 8", nextRun: "Mar 15", enabled: true },
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Scheduled Research</h2>
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
                  {["Topic", "Schedule", "Status", "Last Run", "Next Run", "Actions"].map((h) => (
                    <th key={h} className={`text-xs font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
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
                    <td className="px-5 py-4"><TopicBadge topic={job.topic} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {job.schedule}
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusIndicator status={job.status} /></td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.lastRun}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{job.nextRun}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleJob(job.id)}
                          className={`p-2 rounded-lg transition-colors ${job.enabled ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
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

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <FormField label="Topic">
              <select className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>AI</option>
                <option>Sports</option>
                <option>Finance</option>
                <option>Technology</option>
                <option>General</option>
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
              <input type="time" defaultValue="09:00" className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            </FormField>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">Enable schedule</span>
              <button className="w-11 h-6 bg-primary rounded-full relative transition-colors">
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full transition-transform" />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium">Cancel</button>
            <button className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold shadow-sm">Create</button>
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

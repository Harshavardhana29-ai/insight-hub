import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Database, GitBranch, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import WorkflowPage from "@/pages/WorkflowPage";
import SchedulingPage from "@/pages/SchedulingPage";

const settingsTabs = [
  { id: "knowledge", label: "Knowledge Base", icon: Database },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
] as const;

type SettingsTab = typeof settingsTabs[number]["id"];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("knowledge");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] p-0 overflow-hidden rounded-xl flex flex-col md:flex-row gap-0">
        {/* Tab sidebar */}
        <div className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/30">
          <div className="p-3 md:p-4">
            <h2 className="text-sm font-bold text-foreground">Settings</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Manage your suite configuration</p>
          </div>
          <nav className="flex md:flex-col px-2 md:px-2 pb-2 gap-0.5 overflow-x-auto md:overflow-x-visible">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {activeTab === "knowledge" && <KnowledgeBasePage />}
          {activeTab === "workflows" && <WorkflowPage />}
          {activeTab === "scheduler" && <SchedulingPage />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

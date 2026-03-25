import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Database, GitBranch, Calendar, ArrowLeft } from "lucide-react";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import WorkflowPage from "@/pages/WorkflowPage";
import SchedulingPage from "@/pages/SchedulingPage";

const pageConfig: Record<string, { title: string; icon: React.ElementType; Component: React.ComponentType }> = {
  knowledge: { title: "Knowledge Base", icon: Database, Component: KnowledgeBasePage },
  workflows: { title: "Workflows", icon: GitBranch, Component: WorkflowPage },
  scheduler: { title: "Scheduler", icon: Calendar, Component: SchedulingPage },
};

interface SettingsModalProps {
  page: string | null;
  onClose: () => void;
}

export function SettingsModal({ page, onClose }: SettingsModalProps) {
  if (!page || !pageConfig[page]) return null;

  const config = pageConfig[page];
  const Icon = config.icon;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-[95vw] w-[1100px] h-[90vh] md:h-[85vh] p-0 overflow-hidden rounded-xl flex flex-col">
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm md:text-base font-bold text-foreground">{config.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <config.Component />
        </div>
      </DialogContent>
    </Dialog>
  );
}

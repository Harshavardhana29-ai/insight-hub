import { useState, useEffect } from "react";
import {
  Moon, Sun, LogOut, Database, GitBranch, Calendar, User,
  ChevronDown, Download, Loader2, Check,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import WorkflowPage from "@/pages/WorkflowPage";
import SchedulingPage from "@/pages/SchedulingPage";
import { boschBlue } from "@/lib/bosch-colors";
import { dataSourcesApi, workflowsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usersApi } from "@/lib/api";

type AssistantTab = "knowledge" | "workflows" | "scheduler";

const TABS: { id: AssistantTab; label: string; icon: typeof Database }[] = [
  { id: "knowledge", label: "Knowledge Base", icon: Database },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
];

export function AssistantLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AssistantTab>("knowledge");
  const [darkMode, setDarkMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Fetch admin name for assistants
  useEffect(() => {
    if (user?.role === "assistant") {
      usersApi.getMyAdmin().then(admin => setAdminName(admin.display_name)).catch(() => {});
    }
  }, [user?.id]);

  const handleSyncAll = async () => {
    setSyncing(true);
    let syncedCount = 0;
    let skippedCount = 0;
    try {
      const [publicSources, publicWorkflows] = await Promise.all([
        dataSourcesApi.listPublic({}),
        workflowsApi.listPublic(),
      ]);

      for (const source of publicSources.items) {
        try {
          await dataSourcesApi.syncPublic(source.id);
          syncedCount++;
        } catch {
          skippedCount++;
        }
      }

      for (const workflow of publicWorkflows.items) {
        try {
          await workflowsApi.syncPublic(workflow.id);
          syncedCount++;
        } catch {
          skippedCount++;
        }
      }

      qc.invalidateQueries({ queryKey: ["data-sources"] });
      qc.invalidateQueries({ queryKey: ["data-sources-stats"] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-stats"] });

      if (syncedCount > 0) {
        toast({ title: `Synced ${syncedCount} item(s) successfully${skippedCount > 0 ? ` (${skippedCount} already synced)` : ""}` });
      } else {
        toast({ title: "All sources and workflows are already synced" });
        setSyncDone(true);
      }
      if (syncedCount === 0) setSyncDone(true);
    } catch {
      toast({ title: "Failed to sync", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Top Bar */}
      <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 flex items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 rounded-sm overflow-hidden bg-white flex items-center justify-center px-0.5 shadow-sm border border-border shrink-0">
            <img src="/image1.png" alt="Logo" className="h-full w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight truncate">Tarka</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              Functional OFE — managing for {adminName ?? "…"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                <Avatar className="w-6 h-6">
                  <AvatarFallback
                    className="text-[9px] font-bold text-white"
                    style={{ backgroundColor: boschBlue[50] }}
                  >
                    {user ? user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-foreground hidden sm:inline">
                  {user?.display_name || "User"}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{user?.display_name}</p>
                <p className="text-xs text-muted-foreground">{`${user?.ntid}@bosch.com` || user?.ntid}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{({ super_admin: "Platform Owner", admin: "Functional Head", assistant: "Functional OFE", user: "User" } as Record<string, string>)[user?.role ?? ""] || user?.role?.replace("_", " ")}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Bosch Rainbow Bar */}
      <div
        className="w-full shrink-0"
        style={{
          height: 6,
          backgroundImage: "url(/bosch-rainbow.svg)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Tab Navigation + Sync All */}
      <div className="shrink-0 border-b border-border bg-background px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Sync All — in content bar, not header */}
        {!syncDone ? (
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: boschBlue[50] }}
            title="Sync all public data sources and workflows"
          >
            {syncing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> Sync All</>
            )}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 bg-green-100">
            <Check className="w-3.5 h-3.5" /> All Synced
          </span>
        )}
      </div>

      {/* Page Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "knowledge" && <KnowledgeBasePage />}
        {activeTab === "workflows" && <WorkflowPage />}
        {activeTab === "scheduler" && <SchedulingPage />}
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Moon, Sun, LogOut, Database, GitBranch, Calendar, User,
  ChevronDown,
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Top Bar */}
      <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center">
            <img src="/image.png" alt="Logo" className="w-full h-full object-contain p-0.5 bg-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground leading-tight">Market Research Agentic Suite</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Assistant — managing for {user?.display_name || "Admin"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
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
                <p className="text-xs text-muted-foreground">{user?.ntid || user?.email}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role?.replace("_", " ")}</p>
              </div>
              <DropdownMenuItem><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
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

      {/* Page Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "knowledge" && <KnowledgeBasePage />}
        {activeTab === "workflows" && <WorkflowPage />}
        {activeTab === "scheduler" && <SchedulingPage />}
      </main>
    </div>
  );
}

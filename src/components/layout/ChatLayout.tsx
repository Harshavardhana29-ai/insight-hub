import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Settings, ChevronDown, User, LogOut,
  PanelLeftClose, PanelLeft, MessageSquare, Clock, Plus,
  Database, GitBranch, Calendar, Trash2, Pencil, Check, X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingsModal } from "./SettingsModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  useChatSessions,
  useDeleteChatSession,
  useRenameChatSession,
} from "@/hooks/use-chat";
import { useRecentSchedulerRuns } from "@/hooks/use-scheduler";

type SidebarTab = "chats" | "cron";

const settingsItems = [
  { id: "knowledge", label: "Knowledge Base", icon: Database },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
];

interface ChatLayoutProps {
  children: React.ReactNode;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onSelectCronRun: (runId: string) => void;
}

export function ChatLayout({
  children,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onSelectCronRun,
}: ChatLayoutProps) {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsPopupOpen, setSettingsPopupOpen] = useState(false);
  const [activeSettingsPage, setActiveSettingsPage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("chats");

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Chat sessions
  const { data: sessions = [] } = useChatSessions();
  const deleteMutation = useDeleteChatSession();
  const renameMutation = useRenameChatSession();

  // Cron history
  const { data: recentRuns = [] } = useRecentSchedulerRuns();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openSettingsPage = (id: string) => {
    setActiveSettingsPage(id);
    setSettingsPopupOpen(false);
  };

  const handleRenameStart = (sessionId: string, currentTitle: string) => {
    setRenamingId(sessionId);
    setRenameValue(currentTitle);
  };

  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      renameMutation.mutate({ sessionId: renamingId, title: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = (sessionId: string) => {
    deleteMutation.mutate(sessionId);
  };

  // Group sessions by date
  const groupedSessions = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; items: typeof sessions }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older", items: [] },
    ];

    for (const s of sessions) {
      const d = new Date(s.updated_at);
      d.setHours(0, 0, 0, 0);
      if (d >= today) groups[0].items.push(s);
      else if (d >= yesterday) groups[1].items.push(s);
      else if (d >= weekAgo) groups[2].items.push(s);
      else groups[3].items.push(s);
    }

    return groups.filter(g => g.items.length > 0);
  })();

  const formatCronDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar overlay on mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className={cn(
              "h-full bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 overflow-hidden",
              "fixed md:relative z-40 md:z-0"
            )}
            style={{ width: 280 }}
          >
            {/* Sidebar Header */}
            <div className="p-3 flex items-center justify-between border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center">
                  <img src="/image.png" alt="Logo" className="w-full h-full object-contain p-0.5 bg-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">Market Research Agentic Suite</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Powered by BGSW/BDO</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <Button
                onClick={onNewChat}
                variant="outline"
                className="w-full justify-start gap-2 text-sm h-9 border-dashed"
              >
                <Plus className="w-4 h-4" />
                New Research
              </Button>
            </div>

            {/* Tab Switcher */}
            <div className="px-3 pb-2">
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab("chats")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    activeTab === "chats"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chats
                  {sessions.length > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                      {sessions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("cron")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    activeTab === "cron"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Cron
                  {recentRuns.length > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                      {recentRuns.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {activeTab === "chats" ? (
                /* ─── Chat History Tab ─── */
                <>
                  {groupedSessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">No conversations yet</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Start a new research to begin
                      </p>
                    </div>
                  )}

                  {groupedSessions.map((group) => (
                    <div key={group.label}>
                      <p className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              "group relative w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150",
                              activeSessionId === session.id
                                ? "bg-sidebar-accent text-foreground"
                                : "text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
                            )}
                          >
                            {renamingId === session.id ? (
                              /* Rename mode */
                              <div className="flex items-center gap-1 overflow-hidden">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameConfirm();
                                    if (e.key === "Escape") handleRenameCancel();
                                  }}
                                  className="min-w-0 flex-1 text-sm bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                />
                                <button onClick={handleRenameConfirm} className="shrink-0 p-1 text-primary hover:bg-muted rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={handleRenameCancel} className="shrink-0 p-1 text-muted-foreground hover:bg-muted rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              /* Normal mode */
                              <button
                                className="w-full text-left"
                                onClick={() => onSelectSession(session.id)}
                              >
                                <div className="flex items-start gap-2.5">
                                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate pr-14">{session.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Clock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(session.updated_at).toLocaleDateString("en-US", {
                                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )}

                            {/* Actions (visible on hover) */}
                            {renamingId !== session.id && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRenameStart(session.id, session.title); }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  title="Rename"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                /* ─── Cron History Tab ─── */
                <>
                  <p className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Scheduled Runs
                  </p>

                  {recentRuns.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">No scheduled runs yet</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Configure jobs in Scheduler settings
                      </p>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {recentRuns.map((run) => (
                      <button
                        key={run.id}
                        onClick={() => onSelectCronRun(run.id)}
                        className="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
                      >
                        <div className="flex items-start gap-2.5">
                          <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{run.job_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {formatCronDate(run.run_date)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {run.workflow}
                              </span>
                              <span className={cn(
                                "text-[10px] px-1.5 rounded-full",
                                run.status === "completed"
                                  ? "bg-green-500/10 text-green-600"
                                  : run.status === "failed"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-yellow-500/10 text-yellow-600"
                              )}>
                                {run.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Footer - User */}
            <div className="p-3 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                        {user ? user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {user?.display_name || "User"}
                      </p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">{user?.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                  </div>
                  <DropdownMenuItem><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Popup */}
            <Popover open={settingsPopupOpen} onOpenChange={setSettingsPopupOpen}>
              <PopoverTrigger asChild>
                <button
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-52 p-1.5 rounded-xl">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Configuration
                </p>
                <div className="space-y-0.5">
                  {settingsItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openSettingsPage(item.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-primary" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal page={activeSettingsPage} onClose={() => setActiveSettingsPage(null)} />
    </div>
  );
}

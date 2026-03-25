import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Settings, ChevronDown, User, LogOut,
  PanelLeftClose, PanelLeft, FileText, Clock, Plus,
  Database, GitBranch, Calendar,
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

const historyItems = [
  { id: "h1", title: "Daily AI Briefing", date: "Mar 24, 2026", workflow: "AI News Digest", status: "Completed" },
  { id: "h2", title: "Daily AI Briefing", date: "Mar 23, 2026", workflow: "AI News Digest", status: "Completed" },
  { id: "h4", title: "Weekly Market Report", date: "Mar 11, 2024", workflow: "Market Trend Analysis", status: "Completed" },
];

const settingsItems = [
  { id: "knowledge", label: "Knowledge Base", icon: Database },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
];

interface ChatLayoutProps {
  children: React.ReactNode;
  onSelectHistory: (id: string) => void;
  selectedHistoryId: string | null;
  onNewChat: () => void;
}

export function ChatLayout({ children, onSelectHistory, selectedHistoryId, onNewChat }: ChatLayoutProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsPopupOpen, setSettingsPopupOpen] = useState(false);
  const [activeSettingsPage, setActiveSettingsPage] = useState<string | null>(null);

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

            {/* History */}
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              <p className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Reports
              </p>
              <div className="space-y-0.5">
                {historyItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectHistory(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group",
                      selectedHistoryId === item.id
                        ? "bg-sidebar-accent text-foreground"
                        : "text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{item.date}</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground truncate">{item.workflow}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Footer - User */}
            <div className="p-3 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">KP</AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">Krishna Prakash</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Krishna Prakash</p>
                    <p className="text-xs text-muted-foreground">krishna.prakash@bosch.com</p>
                  </div>
                  <DropdownMenuItem><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><LogOut className="w-4 h-4 mr-2" /> Log out</DropdownMenuItem>
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

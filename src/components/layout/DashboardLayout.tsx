import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Database,
  GitBranch,
  Calendar,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User,
  LogOut,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tabs = [
  { title: "Knowledge Base", path: "/knowledge", icon: Database },
  { title: "Workflows", path: "/workflows", icon: GitBranch },
  { title: "Scheduling", path: "/scheduling", icon: Calendar },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="h-16 border-b border-primary/20 bg-primary shrink-0 flex items-center justify-between px-6 gap-4">
        {/* Left: Logo & App Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm tracking-tight">MRA</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-primary-foreground leading-tight">Market Research Agent</h1>
            <p className="text-[11px] text-primary-foreground/60 leading-tight">Powered by Bosch</p>
          </div>
        </div>

        {/* Center: Tab Navigation */}
        <nav className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="relative"
              >
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 gradient-blue rounded-lg shadow-colored"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10 hidden md:inline">{tab.title}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Search className="w-4 h-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-bosch-red animate-pulse" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-3 py-2 text-sm font-semibold border-b border-border">Notifications</div>
              <DropdownMenuItem>New research report ready</DropdownMenuItem>
              <DropdownMenuItem>Knowledge base updated</DropdownMenuItem>
              <DropdownMenuItem>Scheduled job completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="gradient-blue text-primary-foreground text-xs font-bold">KP</AvatarFallback>
                </Avatar>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-semibold text-foreground leading-tight">Krishna Prakash</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Bosch Research</p>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}

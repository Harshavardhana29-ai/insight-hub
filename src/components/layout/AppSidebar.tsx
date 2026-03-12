import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Database,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Building2,
  User,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { title: "Chat", path: "/", icon: MessageSquare },
  { title: "Knowledge Base", path: "/knowledge", icon: Database },
  { title: "Scheduling", path: "/scheduling", icon: Calendar },
  { title: "Settings", path: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function AppSidebar({ collapsed, onToggle, darkMode, onToggleDark }: AppSidebarProps) {
  const location = useLocation();
  const [workspace] = useState("Acme Research");

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 overflow-hidden"
    >
      {/* Workspace */}
      <div className="h-14 flex items-center px-3 border-b border-sidebar-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full min-w-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">{workspace}</span>
                  <ChevronDown className="w-3 h-3 text-sidebar-foreground shrink-0" />
                </motion.div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>Acme Research</DropdownMenuItem>
            <DropdownMenuItem>Personal Workspace</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Create Workspace</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-foreground text-sm hover:bg-accent transition-colors">
            <Search className="w-4 h-4" />
            <span>Search…</span>
            <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border text-muted-foreground">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
              {!collapsed && <span>{item.title}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
        >
          {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors w-full">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">JD</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-accent-foreground truncate">John Doe</p>
                  <p className="text-xs text-sidebar-foreground truncate">john@acme.com</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><LogOut className="w-4 h-4 mr-2" /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  );
}

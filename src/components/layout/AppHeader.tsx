import { Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <Search className="w-4 h-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2 text-sm font-medium border-b">Notifications</div>
            <DropdownMenuItem>New research report ready</DropdownMenuItem>
            <DropdownMenuItem>Knowledge base updated</DropdownMenuItem>
            <DropdownMenuItem>Scheduled job completed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

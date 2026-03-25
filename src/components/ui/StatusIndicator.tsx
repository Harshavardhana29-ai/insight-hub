import { cn } from "@/lib/utils";

const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  processing: { dot: "bg-primary/70 animate-pulse-dot", text: "text-primary", bg: "bg-primary/10" },
  error: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
  inactive: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  completed: { dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  scheduled: { dot: "bg-primary/70", text: "text-primary", bg: "bg-primary/10" },
  paused: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
};

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.text, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  );
}

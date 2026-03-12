import { cn } from "@/lib/utils";

const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  processing: { dot: "bg-warning animate-pulse-dot", text: "text-warning", bg: "bg-warning/10" },
  error: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
  inactive: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  completed: { dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  scheduled: { dot: "bg-info", text: "text-info", bg: "bg-info/10" },
  paused: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
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

import { cn } from "@/lib/utils";

interface TopicBadgeProps {
  topic: string;
  className?: string;
}

export function TopicBadge({ topic, className }: TopicBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20",
      className
    )}>
      {topic}
    </span>
  );
}

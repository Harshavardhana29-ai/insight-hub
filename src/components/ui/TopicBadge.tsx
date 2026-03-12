import { cn } from "@/lib/utils";

const topicColors: Record<string, string> = {
  AI: "bg-topic-ai/10 text-topic-ai border-topic-ai/20",
  Sports: "bg-topic-sports/10 text-topic-sports border-topic-sports/20",
  Finance: "bg-topic-finance/10 text-topic-finance border-topic-finance/20",
  Technology: "bg-topic-technology/10 text-topic-technology border-topic-technology/20",
  General: "bg-topic-general/10 text-topic-general border-topic-general/20",
};

interface TopicBadgeProps {
  topic: string;
  className?: string;
}

export function TopicBadge({ topic, className }: TopicBadgeProps) {
  const colors = topicColors[topic] || topicColors.General;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", colors, className)}>
      {topic}
    </span>
  );
}

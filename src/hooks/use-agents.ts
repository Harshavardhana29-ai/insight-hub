import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list(),
  });
}

export function useAgentsByTopics(topics: string[]) {
  return useQuery({
    queryKey: ["agents-by-topics", topics],
    queryFn: () => agentsApi.byTopics(topics),
    enabled: topics.length > 0,
  });
}

export function useTopicAgentMapping() {
  return useQuery({
    queryKey: ["topic-agent-mapping"],
    queryFn: () => agentsApi.topicMapping(),
  });
}

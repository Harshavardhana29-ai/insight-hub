import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api";

export function useChatSessions() {
  return useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => chatApi.listSessions(),
    refetchInterval: 10_000,
  });
}

export function useChatSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => chatApi.getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => chatApi.createSession(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

export function useRenameChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      chatApi.renameSession(sessionId, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

export function useDeleteChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => chatApi.deleteSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      content,
      workflowId,
    }: {
      sessionId: string;
      content: string;
      workflowId?: string;
    }) => chatApi.sendMessage(sessionId, content, workflowId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["chat-session", variables.sessionId] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

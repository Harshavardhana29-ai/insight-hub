import { useQuery, useMutation } from "@tanstack/react-query";
import { runsApi } from "@/lib/api";

export function useRunWorkflow() {
  return useMutation({
    mutationFn: ({ workflowId, userPrompt }: { workflowId: string; userPrompt: string }) =>
      runsApi.start(workflowId, userPrompt),
  });
}

export function useRunStatus(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["run-status", runId],
    queryFn: () => runsApi.status(runId!),
    enabled: !!runId && enabled,
    refetchInterval: enabled ? 1500 : false,
  });
}

export function useRunLogs(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["run-logs", runId],
    queryFn: () => runsApi.logs(runId!),
    enabled: !!runId && enabled,
    refetchInterval: enabled ? 1500 : false,
  });
}

export function useRunReport(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["run-report", runId],
    queryFn: () => runsApi.report(runId!),
    enabled: !!runId && enabled,
  });
}

export function useRun(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: () => runsApi.get(runId!),
    enabled: !!runId && enabled,
    refetchInterval: enabled ? 1500 : false,
  });
}

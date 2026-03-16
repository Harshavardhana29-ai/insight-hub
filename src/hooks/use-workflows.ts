import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsApi, type WorkflowCreate, type WorkflowUpdate } from "@/lib/api";

export function useWorkflows(topic?: string) {
  return useQuery({
    queryKey: ["workflows", topic],
    queryFn: () => workflowsApi.list(topic),
  });
}

export function useWorkflowStats() {
  return useQuery({
    queryKey: ["workflow-stats"],
    queryFn: () => workflowsApi.stats(),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkflowCreate) => workflowsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-stats"] });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkflowUpdate }) =>
      workflowsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-stats"] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-stats"] });
    },
  });
}

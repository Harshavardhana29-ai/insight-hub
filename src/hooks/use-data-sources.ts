import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataSourcesApi, type DataSourceCreate } from "@/lib/api";

export function useDataSources(params?: { search?: string; topic?: string; page?: number }) {
  return useQuery({
    queryKey: ["data-sources", params],
    queryFn: () => dataSourcesApi.list(params),
  });
}

export function useDataSourceStats() {
  return useQuery({
    queryKey: ["data-sources-stats"],
    queryFn: () => dataSourcesApi.stats(),
  });
}

export function useActivityLog(limit = 10) {
  return useQuery({
    queryKey: ["activity-log", limit],
    queryFn: () => dataSourcesApi.activity(limit),
  });
}

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => dataSourcesApi.topics(),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => dataSourcesApi.tags(),
  });
}

export function useCreateDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DataSourceCreate) => dataSourcesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      qc.invalidateQueries({ queryKey: ["data-sources-stats"] });
      qc.invalidateQueries({ queryKey: ["activity-log"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      qc.invalidateQueries({ queryKey: ["data-sources-stats"] });
      qc.invalidateQueries({ queryKey: ["activity-log"] });
    },
  });
}

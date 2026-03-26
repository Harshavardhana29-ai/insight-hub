import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  schedulerApi,
  type ScheduledJobApiResponse,
  type JobHistoryApiResponse,
  type ScheduledJobCreatePayload,
  type RecentRunApiResponse,
} from "@/lib/api";
import type {
  ScheduledJob, HistoryEntry, JobStatus,
  WakeMode, OutputFormat, OutputDelivery, ConcurrencyPolicy,
  CreateJobFormData,
} from "@/types/cron";

function mapJob(r: ScheduledJobApiResponse): ScheduledJob {
  return {
    id: r.id,
    jobName: r.job_name,
    type: r.type,
    workflowId: r.workflow_id,
    workflowTitle: r.workflow_title,
    scheduleTime: r.schedule_time,
    nextRun: r.next_run,
    lastRun: r.last_run,
    status: r.status as JobStatus,
    notify: r.notify,
    enabled: r.enabled,
    jobsDone: r.jobs_done,
    userPrompt: r.user_prompt ?? undefined,
    cronExpression: r.cron_expression ?? undefined,
    timezone: r.timezone,
    wakeMode: r.wake_mode as WakeMode,
    outputFormat: r.output_format as OutputFormat,
    outputSchema: r.output_schema ?? undefined,
    deliveryMethods: r.delivery_methods as OutputDelivery[],
    failureBehavior: {
      concurrency: r.failure_behavior.concurrency as ConcurrencyPolicy,
      retry: {
        enabled: r.failure_behavior.retry.enabled,
        maxAttempts: r.failure_behavior.retry.maxAttempts,
        delaySeconds: r.failure_behavior.retry.delaySeconds,
        backoff: r.failure_behavior.retry.backoff as "fixed" | "exponential",
      },
      autoDisableAfter: r.failure_behavior.autoDisableAfter,
      escalationEnabled: false,
    },
  };
}

function mapHistory(r: JobHistoryApiResponse): HistoryEntry {
  return {
    id: r.id,
    runDate: r.run_date,
    status: r.status,
    duration: r.duration,
    workflow: r.workflow,
    agents: r.agents,
    description: r.description,
    reportMarkdown: r.report_markdown ?? undefined,
  };
}

export function formToPayload(form: CreateJobFormData): ScheduledJobCreatePayload {
  return {
    name: form.name,
    user_prompt: form.userPrompt,
    workflow_id: form.workflowId,
    enabled: form.enabled,
    schedule_type: form.scheduleType,
    cron_expression: form.cronExpression,
    one_time_date: form.oneTimeDate || null,
    timezone: form.timezone,
    wake_mode: form.executionContext.wakeMode,
    output_format: form.outputBehavior.expectedOutputFormat,
    output_schema: form.outputBehavior.outputSchema,
    delivery_methods: form.outputBehavior.deliveryMethods,
    concurrency_policy: form.failureBehavior.concurrency,
    retry_enabled: form.failureBehavior.retry.enabled,
    retry_max_attempts: form.failureBehavior.retry.maxAttempts,
    retry_delay_seconds: form.failureBehavior.retry.delaySeconds,
    retry_backoff: form.failureBehavior.retry.backoff,
    auto_disable_after: form.failureBehavior.autoDisableAfter,
  };
}

export function useScheduledJobs() {
  return useQuery({
    queryKey: ["scheduled-jobs"],
    queryFn: async () => {
      const data = await schedulerApi.listJobs();
      return data.map(mapJob);
    },
    refetchInterval: 3_000,
  });
}

export function useRecentSchedulerRuns() {
  return useQuery({
    queryKey: ["scheduler-recent-runs"],
    queryFn: () => schedulerApi.recentRuns(),
    refetchInterval: 30_000,
  });
}

export function useJobHistory(jobId: string | null) {
  return useQuery({
    queryKey: ["job-history", jobId],
    queryFn: async () => {
      const data = await schedulerApi.jobHistory(jobId!);
      return data.map(mapHistory);
    },
    enabled: !!jobId,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduledJobCreatePayload) => schedulerApi.createJob(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduledJobCreatePayload }) =>
      schedulerApi.updateJob(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });
}

export function useToggleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.toggleJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });
}

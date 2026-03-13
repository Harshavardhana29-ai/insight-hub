export type ScheduleType = 'recurring' | 'one-time';
export type WakeMode = 'next-heartbeat' | 'immediate';
export type OutputFormat = 'markdown' | 'plain-text' | 'json' | 'pdf';
export type OutputDelivery = 'internal-log' | 'outlook' | 'teams';
export type ConcurrencyPolicy = 'allow' | 'skip' | 'queue';
export type BackoffStrategy = 'fixed' | 'exponential';
export type EscalationChannel = 'email' | 'webhook' | 'in-app';
export type JobStatus = 'active' | 'running' | 'failed' | 'paused';

export interface CreateJobFormData {
  name: string;
  userPrompt: string;
  workflowId: string;
  enabled: boolean;
  scheduleType: ScheduleType;
  cronExpression: string;
  oneTimeDate: string;
  timezone: string;
  executionContext: {
    wakeMode: WakeMode;
  };
  outputBehavior: {
    expectedOutputFormat: OutputFormat;
    outputSchema: string;
    deliveryMethods: OutputDelivery[];
    storeStdout: boolean;
    storeStderr: boolean;
    retentionDays: number;
    maxSizeKb: number;
    outlookEmail: string;
    teamsWebhook: string;
  };
  failureBehavior: {
    concurrency: ConcurrencyPolicy;
    retry: {
      enabled: boolean;
      maxAttempts: number;
      delaySeconds: number;
      backoff: BackoffStrategy;
    };
    autoDisableAfter: number;
    escalationEnabled: boolean;
    escalationChannel?: EscalationChannel;
    escalationContact?: string;
  };
}

export interface ScheduledJob {
  id: string;
  jobName: string;
  type: string;
  workflowId: string;
  workflowTitle: string;
  scheduleTime: string;
  nextRun: string;
  lastRun: string;
  status: JobStatus;
  notify: boolean;
  enabled: boolean;
  jobsDone: number;
  userPrompt?: string;
  cronExpression?: string;
  timezone?: string;
  wakeMode?: WakeMode;
  outputFormat?: OutputFormat;
  outputSchema?: string;
  deliveryMethods?: OutputDelivery[];
  failureBehavior?: CreateJobFormData['failureBehavior'];
}

export interface HistoryEntry {
  id: string;
  runDate: string;
  status: string;
  duration: string;
  workflow: string;
  agents: string[];
  description: string;
  reportMarkdown?: string;
}

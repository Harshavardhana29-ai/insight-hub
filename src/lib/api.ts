const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

import { getStoredToken, clearAuth } from "@/lib/auth";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Data Sources ───────────────────────────────────────────────

export interface DataSourceResponse {
  id: string;
  url: string;
  title: string;
  description: string | null;
  topic: string;
  tags: string[];
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataSourceListResponse {
  items: DataSourceResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface DataSourceCreate {
  url: string;
  title: string;
  description?: string;
  topic: string;
  tags: string[];
  is_public?: boolean;
}

export interface DataSourceStats {
  total_sources: number;
  topic_count: number;
}

export interface ActivityLogEntry {
  action: string;
  source: string;
  time: string;
  color: string;
}

export const dataSourcesApi = {
  list: (params?: { search?: string; topic?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.topic && params.topic !== "All") qs.set("topic", params.topic);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const query = qs.toString();
    return request<DataSourceListResponse>(`/data-sources${query ? `?${query}` : ""}`);
  },

  get: (id: string) => request<DataSourceResponse>(`/data-sources/${id}`),

  create: (data: DataSourceCreate) =>
    request<DataSourceResponse>("/data-sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<DataSourceCreate & { status: string }>) =>
    request<DataSourceResponse>(`/data-sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/data-sources/${id}`, { method: "DELETE" }),

  stats: () => request<DataSourceStats>("/data-sources/stats"),

  activity: (limit = 10) =>
    request<ActivityLogEntry[]>(`/data-sources/activity?limit=${limit}`),

  topics: () => request<string[]>("/data-sources/topics"),

  tags: () => request<string[]>("/data-sources/tags"),

  listPublic: (params?: { search?: string; topic?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.topic && params.topic !== "All") qs.set("topic", params.topic);
    const query = qs.toString();
    return request<DataSourceListResponse>(`/data-sources/public/list${query ? `?${query}` : ""}`);
  },

  syncPublic: (id: string) =>
    request<DataSourceResponse>(`/data-sources/public/${id}/sync`, { method: "POST" }),
};

// ─── Workflows ──────────────────────────────────────────────────

export interface WorkflowDataSource {
  id: string;
  title: string;
  topic: string;
}

export interface WorkflowAgent {
  id: string;
  name: string;
}

export interface WorkflowResponse {
  id: string;
  title: string;
  topic: string;
  status: string;
  source_selection_mode: string;
  selected_topics: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  data_sources: WorkflowDataSource[];
  agents: WorkflowAgent[];
}

export interface WorkflowListResponse {
  items: WorkflowResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface WorkflowCreate {
  title: string;
  topic: string;
  status?: string;
  source_selection_mode: string;
  selected_topics: string[];
  data_source_ids: string[];
  agent_ids: string[];
  is_public?: boolean;
}

export interface WorkflowUpdate {
  title?: string;
  topic?: string;
  status?: string;
  source_selection_mode?: string;
  selected_topics?: string[];
  data_source_ids?: string[];
  agent_ids?: string[];
  is_public?: boolean;
}

export interface WorkflowStats {
  total: number;
  agents_used: number;
}

export const workflowsApi = {
  list: (params?: { topic?: string; search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.topic && params.topic.toLowerCase() !== "all") qs.set("topic", params.topic);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const query = qs.toString();
    return request<WorkflowListResponse>(`/workflows${query ? `?${query}` : ""}`);
  },

  get: (id: string) => request<WorkflowResponse>(`/workflows/${id}`),

  create: (data: WorkflowCreate) =>
    request<WorkflowResponse>("/workflows", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: WorkflowUpdate) =>
    request<WorkflowResponse>(`/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/workflows/${id}`, { method: "DELETE" }),

  stats: () => request<WorkflowStats>("/workflows/stats"),

  listPublic: (topic?: string) => {
    const qs = topic && topic.toLowerCase() !== "all" ? `?topic=${topic}` : "";
    return request<WorkflowListResponse>(`/workflows/public/list${qs}`);
  },

  syncPublic: (id: string) =>
    request<WorkflowResponse>(`/workflows/public/${id}/sync`, { method: "POST" }),
};

// ─── Agents ─────────────────────────────────────────────────────

export interface AgentResponse {
  id: string;
  name: string;
  description: string | null;
  api_url: string | null;
  api_method: string;
  is_active: string;
}

export interface TopicAgentMapResponse {
  mapping: Record<string, AgentResponse[]>;
}

export const agentsApi = {
  list: () => request<AgentResponse[]>("/agents"),

  byTopics: (topics: string[]) => {
    const qs = topics.map((t) => `topics=${encodeURIComponent(t)}`).join("&");
    return request<AgentResponse[]>(`/agents/by-topics?${qs}`);
  },

  topicMapping: () => request<TopicAgentMapResponse>("/agents/topic-mapping"),
};

// ─── Runs ───────────────────────────────────────────────────────

export interface RunStartResponse {
  run_id: string;
  status: string;
}

export interface RunLogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export interface RunStatusResponse {
  id: string;
  status: string;
  progress: number;
  log_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowRunResponse {
  id: string;
  workflow_id: string;
  user_prompt: string | null;
  status: string;
  progress: number;
  report_markdown: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  logs: RunLogEntry[];
}

export const runsApi = {
  start: (workflowId: string, userPrompt: string) =>
    request<RunStartResponse>(`/runs/workflow/${workflowId}/run`, {
      method: "POST",
      body: JSON.stringify({ user_prompt: userPrompt }),
    }),

  get: (runId: string) =>
    request<WorkflowRunResponse>(`/runs/${runId}`),

  status: (runId: string) =>
    request<RunStatusResponse>(`/runs/${runId}/status`),

  logs: (runId: string) =>
    request<RunLogEntry[]>(`/runs/${runId}/logs`),

  report: (runId: string) =>
    request<{ report_markdown: string }>(`/runs/${runId}/report`),
};

// ─── Scheduler ──────────────────────────────────────────────────

export interface ScheduledJobApiResponse {
  id: string;
  job_name: string;
  type: string;
  workflow_id: string;
  workflow_title: string;
  schedule_time: string;
  next_run: string | null;
  last_run: string | null;
  status: string;
  notify: boolean;
  enabled: boolean;
  jobs_done: number;
  user_prompt: string | null;
  cron_expression: string | null;
  timezone: string;
  wake_mode: string;
  output_format: string;
  output_schema: string | null;
  delivery_methods: string[];
  failure_behavior: {
    concurrency: string;
    retry: { enabled: boolean; maxAttempts: number; delaySeconds: number; backoff: string };
    autoDisableAfter: number;
  };
}

export interface JobHistoryApiResponse {
  id: string;
  run_date: string | null;
  status: string;
  duration: string;
  workflow: string;
  agents: string[];
  description: string;
  report_markdown: string | null;
}

export interface JobCountsApiResponse {
  active: number;
  running: number;
  failed: number;
  paused: number;
}

export interface ScheduledJobCreatePayload {
  name: string;
  user_prompt: string;
  workflow_id: string;
  enabled: boolean;
  schedule_type: string;
  cron_expression: string;
  one_time_date: string | null;
  timezone: string;
  wake_mode: string;
  output_format: string;
  output_schema: string;
  delivery_methods: string[];
  concurrency_policy: string;
  retry_enabled: boolean;
  retry_max_attempts: number;
  retry_delay_seconds: number;
  retry_backoff: string;
  auto_disable_after: number;
}

export interface ScheduledJobListApiResponse {
  items: ScheduledJobApiResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export const schedulerApi = {
  listJobs: (params?: { status?: string; search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const query = qs.toString();
    return request<ScheduledJobListApiResponse>(`/scheduler/jobs${query ? `?${query}` : ""}`);
  },

  createJob: (data: ScheduledJobCreatePayload) =>
    request<ScheduledJobApiResponse>("/scheduler/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateJob: (id: string, data: ScheduledJobCreatePayload) =>
    request<ScheduledJobApiResponse>(`/scheduler/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteJob: (id: string) =>
    request<void>(`/scheduler/jobs/${id}`, { method: "DELETE" }),

  toggleJob: (id: string) =>
    request<ScheduledJobApiResponse>(`/scheduler/jobs/${id}/toggle`, {
      method: "POST",
    }),

  jobHistory: (id: string) =>
    request<JobHistoryApiResponse[]>(`/scheduler/jobs/${id}/history`),

  counts: () =>
    request<JobCountsApiResponse>("/scheduler/jobs/counts"),

  recentRuns: () =>
    request<RecentRunApiResponse[]>("/scheduler/recent-runs"),
};

export interface RecentRunApiResponse {
  id: string;
  job_name: string;
  run_date: string | null;
  workflow: string;
  status: string;
  report_markdown: string | null;
}

// ─── User Management ────────────────────────────────────────────

export interface UserResponse {
  id: string;
  sso_id: string;
  ntid: string | null;
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  admin_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  items: UserResponse[];
  total: number;
}

export interface UserCreatePayload {
  ntid: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  role: "admin" | "assistant";
  admin_id?: string;
}

export interface UserUpdatePayload {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  admin_id?: string | null;
  is_active?: boolean;
}

export const usersApi = {
  list: (params?: { search?: string; role?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.role && params.role !== "all") qs.set("role", params.role);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const query = qs.toString();
    return request<UserListResponse>(`/users${query ? `?${query}` : ""}`);
  },

  get: (id: string) => request<UserResponse>(`/users/${id}`),

  create: (data: UserCreatePayload) =>
    request<UserResponse>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UserUpdatePayload) =>
    request<UserResponse>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),

  listAdmins: () => request<UserResponse[]>("/users/admins"),

  listMyAssistants: () => request<UserResponse[]>("/users/my-assistants"),

  addAssistant: (data: UserCreatePayload) =>
    request<UserResponse>("/users/assistants", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Chat Sessions ──────────────────────────────────────────────

export interface ChatMessageApiResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  message_type: "text" | "report" | "error";
  workflow_id: string | null;
  run_id: string | null;
  workflow_title: string | null;
  created_at: string;
}

export interface ChatSessionApiResponse {
  id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

export interface ChatSessionDetailApiResponse {
  id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  messages: ChatMessageApiResponse[];
}

export const chatApi = {
  listSessions: () =>
    request<ChatSessionApiResponse[]>("/chat/sessions"),

  createSession: (title = "New Research") =>
    request<ChatSessionApiResponse>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getSession: (sessionId: string) =>
    request<ChatSessionDetailApiResponse>(`/chat/sessions/${sessionId}`),

  renameSession: (sessionId: string, title: string) =>
    request<ChatSessionApiResponse>(`/chat/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteSession: (sessionId: string) =>
    request<void>(`/chat/sessions/${sessionId}`, { method: "DELETE" }),

  sendMessage: (sessionId: string, content: string, workflowId?: string) =>
    request<ChatMessageApiResponse>(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        workflow_id: workflowId || null,
      }),
    }),
};

const API_BASE = "http://localhost:8000/api";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

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
  created_at: string;
  updated_at: string;
  data_sources: WorkflowDataSource[];
  agents: WorkflowAgent[];
}

export interface WorkflowListResponse {
  items: WorkflowResponse[];
  total: number;
}

export interface WorkflowCreate {
  title: string;
  topic: string;
  status?: string;
  source_selection_mode: string;
  selected_topics: string[];
  data_source_ids: string[];
  agent_ids: string[];
}

export interface WorkflowUpdate {
  title?: string;
  topic?: string;
  status?: string;
  source_selection_mode?: string;
  selected_topics?: string[];
  data_source_ids?: string[];
  agent_ids?: string[];
}

export interface WorkflowStats {
  total: number;
  agents_used: number;
}

export const workflowsApi = {
  list: (topic?: string) => {
    const qs = topic && topic.toLowerCase() !== "all" ? `?topic=${topic}` : "";
    return request<WorkflowListResponse>(`/workflows${qs}`);
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

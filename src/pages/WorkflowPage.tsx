import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, GitBranch, Edit, Trash2, Bot, Database,
  Workflow, Zap, Search, X, ChevronDown, Loader2,
} from "lucide-react";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useWorkflows, useWorkflowStats, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow } from "@/hooks/use-workflows";
import { useDataSources } from "@/hooks/use-data-sources";
import { useAgentsByTopics, useTopicAgentMapping } from "@/hooks/use-agents";
import { useTopics } from "@/hooks/use-data-sources";
import { useToast } from "@/hooks/use-toast";
import type { WorkflowResponse, AgentResponse } from "@/lib/api";

const topicGradient: Record<string, string> = {
  AI: "gradient-purple",
  Technology: "gradient-blue",
  Finance: "gradient-turquoise",
  Sports: "gradient-green",
  General: "gradient-blue",
};

// Searchable dropdown component
function SearchableDropdown({
  options,
  selected,
  onToggle,
  placeholder,
  renderOption,
  multiple = true,
}: {
  options: { id: string; label: string; extra?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  renderOption?: (opt: { id: string; label: string; extra?: string }) => React.ReactNode;
  multiple?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.extra && o.extra.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl bg-muted border border-border cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
          onClick={(e) => e.stopPropagation()}
        />
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results found</p>
          )}
          {filtered.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onToggle(opt.id); if (!multiple) setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl ${
                selected.includes(opt.id) ? "bg-accent/60" : ""
              }`}
            >
              {multiple && (
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(opt.id) ? "bg-primary border-primary" : "border-border"
                }`}>
                  {selected.includes(opt.id) && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                </div>
              )}
              {renderOption ? renderOption(opt) : (
                <span className="flex-1">{opt.label}</span>
              )}
              {!multiple && selected.includes(opt.id) && (
                <span className="text-primary text-xs font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowResponse | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const { toast } = useToast();

  // API hooks
  const { data: workflowsData, isLoading } = useWorkflows(selectedTopic !== "all" ? selectedTopic : undefined);
  const { data: statsData } = useWorkflowStats();
  const { data: topicsList } = useTopics();
  const { data: allDataSourcesData } = useDataSources();
  const { data: topicAgentMap } = useTopicAgentMapping();
  const deleteMutation = useDeleteWorkflow();

  const workflows = workflowsData?.items ?? [];
  const allDataSources = allDataSourcesData?.items ?? [];
  const topics = topicsList ?? [];
  const topicAgents: Record<string, string[]> = useMemo(() => {
    if (!topicAgentMap?.mapping) return {};
    const result: Record<string, string[]> = {};
    for (const [topic, agents] of Object.entries(topicAgentMap.mapping)) {
      result[topic] = agents.map((a: AgentResponse) => a.name);
    }
    return result;
  }, [topicAgentMap]);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [sourceSelectionMode, setSourceSelectionMode] = useState<"topic" | "both" | "individual">("topic");
  const [selectedSourceTopics, setSelectedSourceTopics] = useState<string[]>([]);
  const [selectedIndividualSources, setSelectedIndividualSources] = useState<string[]>([]);
  const [individualTopicFilter, setIndividualTopicFilter] = useState<string>("all");

  const isEdit = !!editingWorkflow;

  // Derive available agents from selected topics + individual sources
  const relevantTopics = useMemo(() => {
    const topicSet = new Set<string>();
    // Always include selected topics
    if (sourceSelectionMode === "topic" || sourceSelectionMode === "both") {
      selectedSourceTopics.forEach((t) => topicSet.add(t));
    }
    // Always include topics from individually selected sources
    if (sourceSelectionMode === "individual" || sourceSelectionMode === "both") {
      selectedIndividualSources.forEach((id) => {
        const ds = allDataSources.find((s) => s.id === id);
        if (ds) topicSet.add(ds.topic);
      });
    }
    return Array.from(topicSet);
  }, [sourceSelectionMode, selectedSourceTopics, selectedIndividualSources, allDataSources]);

  const { data: availableAgentsFromApi } = useAgentsByTopics(relevantTopics);

  const availableAgents = useMemo(() => {
    return (availableAgentsFromApi ?? []).map(a => ({ id: a.id, name: a.name }));
  }, [availableAgentsFromApi]);

  // Filter individual sources by topic filter
  const filteredIndividualSources = useMemo(() => {
    // In "both" mode, show ALL data sources so user can add extras from any topic
    if (sourceSelectionMode === "both") {
      return allDataSources;
    }
    if (individualTopicFilter === "all") return allDataSources;
    return allDataSources.filter(ds => ds.topic === individualTopicFilter);
  }, [sourceSelectionMode, individualTopicFilter, allDataSources]);

  const toggleAgent = (agentName: string, agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentName) ? prev.filter((a) => a !== agentName) : [...prev, agentName]
    );
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId]
    );
  };

  const toggleSource = (sourceId: string) => {
    setSelectedIndividualSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]
    );
  };

  const toggleSourceTopic = (topicId: string) => {
    setSelectedSourceTopics((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const resetForm = () => {
    setFormTitle("");
    setSelectedAgents([]);
    setSelectedAgentIds([]);
    setSourceSelectionMode("topic");
    setSelectedSourceTopics([]);
    setSelectedIndividualSources([]);
    setEditingWorkflow(null);
    setIndividualTopicFilter("all");
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (workflow: WorkflowResponse) => {
    setEditingWorkflow(workflow);
    setFormTitle(workflow.title);
    setSelectedAgents(workflow.agents.map(a => a.name));
    setSelectedAgentIds(workflow.agents.map(a => a.id));

    const workflowSourceIds = workflow.data_sources.map(ds => ds.id);
    const workflowSourceTopics = [...new Set(workflow.data_sources.map(ds => ds.topic))];

    setSelectedSourceTopics(workflowSourceTopics.length > 0 ? workflowSourceTopics : [workflow.topic]);
    setSelectedIndividualSources(workflowSourceIds);
    setSourceSelectionMode("both");
    setShowModal(true);
  };

  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: "Please enter a workflow title", variant: "destructive" });
      return;
    }

    // Collect data source IDs
    const dsIds = new Set<string>();
    if (sourceSelectionMode === "topic" || sourceSelectionMode === "both") {
      allDataSources
        .filter(ds => selectedSourceTopics.includes(ds.topic))
        .forEach(ds => dsIds.add(ds.id));
    }
    if (sourceSelectionMode === "individual" || sourceSelectionMode === "both") {
      selectedIndividualSources.forEach(id => dsIds.add(id));
    }

    const primaryTopic = selectedSourceTopics[0] || relevantTopics[0] || "General";

    try {
      if (isEdit && editingWorkflow) {
        await updateMutation.mutateAsync({
          id: editingWorkflow.id,
          data: {
            title: formTitle,
            topic: primaryTopic,
            source_selection_mode: sourceSelectionMode,
            selected_topics: selectedSourceTopics,
            data_source_ids: Array.from(dsIds),
            agent_ids: selectedAgentIds,
          },
        });
        toast({ title: "Workflow updated" });
      } else {
        await createMutation.mutateAsync({
          title: formTitle,
          topic: primaryTopic,
          status: "Draft",
          source_selection_mode: sourceSelectionMode,
          selected_topics: selectedSourceTopics,
          data_source_ids: Array.from(dsIds),
          agent_ids: selectedAgentIds,
        });
        toast({ title: "Workflow created" });
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast({ title: "Failed to save workflow", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Workflow deleted" });
    } catch {
      toast({ title: "Failed to delete workflow", variant: "destructive" });
    }
  };

  const filteredWorkflows = workflows;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center shadow-sm">
              <GitBranch className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Workflows</h2>
              <p className="text-sm text-muted-foreground">
                {workflows.filter((w) => w.status === "Active").length} active workflows
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 gradient-blue text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-colored"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Total", value: statsData?.total ?? workflows.length, icon: Workflow, color: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
            { label: "Agents Used", value: statsData?.agents_used ?? 0, icon: Bot, color: "border-l-bosch-turquoise", iconBg: "bg-bosch-turquoise/10 text-bosch-turquoise" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ y: -2, boxShadow: "0 8px 24px -8px hsl(220 20% 10% / 0.12)" }}
              className={`bg-card border border-border rounded-md p-4 transition-all border-l-4 ${stat.color}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-md ${stat.iconBg} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", ...topics].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedTopic === t
                  ? "gradient-blue text-primary-foreground shadow-colored"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWorkflows.map((workflow, i) => (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-md overflow-hidden hover:shadow-md transition-all group"
            >
              <div className={`h-1 ${topicGradient[workflow.topic] || "gradient-blue"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${topicGradient[workflow.topic] || "gradient-blue"} flex items-center justify-center shadow-sm`}>
                      <GitBranch className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{workflow.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Created {new Date(workflow.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={workflow.status} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(workflow)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(workflow.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Data Sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.data_sources.map((ds) => (
                        <span key={ds.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium text-accent-foreground">
                          <Database className="w-3 h-3" />
                          {ds.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Agents</p>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.agents.map((agent) => (
                        <span key={agent.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-bosch-purple/10 rounded-lg text-xs font-medium text-bosch-purple">
                          <Bot className="w-3 h-3" />
                          {agent.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <TopicBadge topic={workflow.topic} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit && <Edit className="w-5 h-5 text-bosch-turquoise" />}
              {isEdit ? "Edit Workflow" : "Create Workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Workflow Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. AI News Digest"
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Data Sources</label>
              <div className="flex gap-2 mt-1.5 mb-3">
                {([
                  { key: "topic" as const, label: "By Topic" },
                  { key: "both" as const, label: "Topic + Sources" },
                  { key: "individual" as const, label: "Individual Sources" },
                ]).map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setSourceSelectionMode(mode.key)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      sourceSelectionMode === mode.key
                        ? (isEdit ? "gradient-turquoise" : "gradient-blue") + " text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {(sourceSelectionMode === "topic" || sourceSelectionMode === "both") && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Select topics</p>
                  <SearchableDropdown
                    options={topics.map(t => ({ id: t, label: t }))}
                    selected={selectedSourceTopics}
                    onToggle={toggleSourceTopic}
                    placeholder="Search topics…"
                    multiple={true}
                  />
                  {selectedSourceTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedSourceTopics.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium text-accent-foreground">
                          {t}
                          <button onClick={() => toggleSourceTopic(t)} className="hover:text-destructive transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(sourceSelectionMode === "individual" || sourceSelectionMode === "both") && (
                <div>
                  {sourceSelectionMode === "individual" && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1.5">Filter by topic</p>
                      <SearchableDropdown
                        options={[{ id: "all", label: "All Topics" }, ...topics.map(t => ({ id: t, label: t }))]}
                        selected={[individualTopicFilter]}
                        onToggle={(id) => setIndividualTopicFilter(id)}
                        placeholder="Filter by topic…"
                        multiple={false}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-1.5 mt-2">
                    {sourceSelectionMode === "both" ? "Add extra data sources from any topic" : "Select individual sources"}
                  </p>
                  <SearchableDropdown
                    options={filteredIndividualSources.map(ds => ({ id: ds.id, label: ds.title, extra: ds.topic }))}
                    selected={selectedIndividualSources}
                    onToggle={toggleSource}
                    placeholder="Search data sources…"
                    renderOption={(opt) => (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-foreground flex-1">{opt.label}</span>
                        <TopicBadge topic={opt.extra || ""} />
                      </div>
                    )}
                  />
                  {selectedIndividualSources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedIndividualSources.map(id => {
                        const ds = allDataSources.find(s => s.id === id);
                        return ds ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium text-accent-foreground">
                            <Database className="w-3 h-3" />
                            {ds.title}
                            <button onClick={() => toggleSource(id)} className="hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agents */}
            <div>
              <label className="text-sm font-medium text-foreground">Agents</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                {availableAgents.length > 0
                  ? "Available agents based on your selection"
                  : "Select topics or data sources to see available agents"}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.name, agent.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all border ${
                      selectedAgents.includes(agent.name)
                        ? "gradient-purple text-primary-foreground border-transparent shadow-sm"
                        : "bg-card text-foreground border-border hover:border-bosch-purple/40 hover:bg-bosch-purple/5"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {agent.name}
                  </button>
                ))}
                {availableAgents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No agents available — select a topic or data source first.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-4 py-2.5 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className={`px-5 py-2.5 text-sm rounded-md ${isEdit ? "gradient-turquoise" : "gradient-blue"} text-primary-foreground hover:opacity-90 transition-all font-semibold shadow-colored disabled:opacity-50`}
            >
              {isEdit ? "Update Workflow" : "Create Workflow"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

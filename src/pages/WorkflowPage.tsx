import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  GitBranch,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Bot,
  Database,
} from "lucide-react";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Workflow {
  id: string;
  title: string;
  dataSources: string[];
  agents: string[];
  topic: string;
  status: string;
  createdAt: string;
}

const mockAgents = [
  "News Aggregator",
  "Sentiment Analyzer",
  "Trend Detector",
  "Report Generator",
  "Data Extractor",
];

const mockDataSources = [
  { id: "1", name: "Gartner AI Hype Cycle 2024", topic: "AI" },
  { id: "2", name: "TechCrunch AI Trends", topic: "Technology" },
  { id: "3", name: "Bloomberg Finance API", topic: "Finance" },
  { id: "4", name: "ESPN Sports Analytics", topic: "Sports" },
  { id: "5", name: "McKinsey Quarterly Report", topic: "General" },
  { id: "6", name: "OpenAI Research Papers", topic: "AI" },
];

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    title: "AI News Digest",
    dataSources: ["Gartner AI Hype Cycle 2024", "OpenAI Research Papers"],
    agents: ["News Aggregator", "Sentiment Analyzer"],
    topic: "AI",
    status: "Active",
    createdAt: "2024-03-15",
  },
  {
    id: "2",
    title: "Market Trend Analysis",
    dataSources: ["Bloomberg Finance API"],
    agents: ["Trend Detector", "Report Generator"],
    topic: "Finance",
    status: "Active",
    createdAt: "2024-03-12",
  },
  {
    id: "3",
    title: "Tech Industry Monitor",
    dataSources: ["TechCrunch AI Trends"],
    agents: ["News Aggregator", "Data Extractor", "Report Generator"],
    topic: "Technology",
    status: "Draft",
    createdAt: "2024-03-10",
  },
  {
    id: "4",
    title: "Sports Analytics Weekly",
    dataSources: ["ESPN Sports Analytics"],
    agents: ["Data Extractor", "Sentiment Analyzer"],
    topic: "Sports",
    status: "Active",
    createdAt: "2024-03-08",
  },
];

const topics = ["AI", "Sports", "Finance", "Technology", "General"];

export default function WorkflowPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflows] = useState(mockWorkflows);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [sourceSelectionMode, setSourceSelectionMode] = useState<"topic" | "individual">("topic");
  const [selectedSourceTopic, setSelectedSourceTopic] = useState("AI");
  const [selectedIndividualSources, setSelectedIndividualSources] = useState<string[]>([]);

  const toggleAgent = (agent: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
    );
  };

  const toggleSource = (sourceId: string) => {
    setSelectedIndividualSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]
    );
  };

  const resetForm = () => {
    setSelectedAgents([]);
    setSourceSelectionMode("topic");
    setSelectedSourceTopic("AI");
    setSelectedIndividualSources([]);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Workflows</h2>
              <p className="text-sm text-muted-foreground">
                {workflows.filter((w) => w.status === "Active").length} active workflows
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", ...topics].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedTopic === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows
            .filter((w) => selectedTopic === "all" || w.topic === selectedTopic)
            .map((workflow, i) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{workflow.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Created {workflow.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={workflow.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Data Sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.dataSources.map((ds) => (
                        <span key={ds} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-foreground">
                          <Database className="w-3 h-3 text-muted-foreground" />
                          {ds}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Agents</p>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.agents.map((agent) => (
                        <span key={agent} className="inline-flex items-center gap-1 px-2 py-1 bg-info/10 rounded-md text-xs text-info">
                          <Bot className="w-3 h-3" />
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <TopicBadge topic={workflow.topic} />
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-foreground">Workflow Title</label>
              <input
                type="text"
                placeholder="e.g. AI News Digest"
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Data Sources */}
            <div>
              <label className="text-sm font-medium text-foreground">Data Sources</label>
              <div className="flex gap-2 mt-1.5 mb-3">
                <button
                  onClick={() => setSourceSelectionMode("topic")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    sourceSelectionMode === "topic"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  By Topic
                </button>
                <button
                  onClick={() => setSourceSelectionMode("individual")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    sourceSelectionMode === "individual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Individual Sources
                </button>
              </div>

              {sourceSelectionMode === "topic" ? (
                <select
                  value={selectedSourceTopic}
                  onChange={(e) => setSelectedSourceTopic(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>{t} — all sources</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
                  {mockDataSources.map((ds) => (
                    <label
                      key={ds.id}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedIndividualSources.includes(ds.id) ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIndividualSources.includes(ds.id)}
                        onChange={() => toggleSource(ds.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground flex-1">{ds.name}</span>
                      <TopicBadge topic={ds.topic} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Selection */}
            <div>
              <label className="text-sm font-medium text-foreground">Agents</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Select one or more agents for this workflow</p>
              <div className="flex flex-wrap gap-2">
                {mockAgents.map((agent) => (
                  <button
                    key={agent}
                    onClick={() => toggleAgent(agent)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      selectedAgents.includes(agent)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {agent}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
            >
              Cancel
            </button>
            <button className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold shadow-sm">
              Create Workflow
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

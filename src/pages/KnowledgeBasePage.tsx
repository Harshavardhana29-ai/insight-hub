import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Globe, Filter, Trash2, Clock,
  Database, Tag,
} from "lucide-react";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface KnowledgeSource {
  id: string;
  name: string;
  type: "URL";
  topic: string;
  uploadDate: string;
  status: string;
}

const mockSources: KnowledgeSource[] = [
  { id: "1", name: "Gartner AI Hype Cycle 2024", type: "URL", topic: "AI", uploadDate: "2024-03-15", status: "Active" },
  { id: "2", name: "https://techcrunch.com/ai-trends", type: "URL", topic: "Technology", uploadDate: "2024-03-14", status: "Active" },
  { id: "3", name: "Bloomberg Finance Data Feed", type: "URL", topic: "Finance", uploadDate: "2024-03-12", status: "Active" },
  { id: "4", name: "ESPN Sports Analytics", type: "URL", topic: "Sports", uploadDate: "2024-03-10", status: "Processing" },
  { id: "5", name: "McKinsey Industry Insights", type: "URL", topic: "General", uploadDate: "2024-03-08", status: "Active" },
  { id: "6", name: "OpenAI Research Papers", type: "URL", topic: "AI", uploadDate: "2024-03-05", status: "Error" },
];

const stats = [
  { label: "Total Sources", value: "24", change: "+3 this week", icon: Database, gradient: "gradient-blue" },
  { label: "Active", value: "19", change: "79% uptime", icon: TrendingUp, gradient: "gradient-green" },
  { label: "Processing", value: "3", change: "~2 min avg", icon: Layers, gradient: "gradient-purple" },
  { label: "Topics", value: "5", change: "Covered", icon: Tag, gradient: "gradient-turquoise" },
];

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filtered = mockSources.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTopic = topicFilter === "All" || s.topic === topicFilter;
    return matchSearch && matchTopic;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge sources…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>All</option>
              <option>AI</option>
              <option>Sports</option>
              <option>Finance</option>
              <option>Technology</option>
              <option>General</option>
            </select>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 gradient-blue text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-colored"
          >
            <Plus className="w-4 h-4" />
            Add Data Source
          </button>
        </div>

        {/* Stats with gradient icons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-card border border-border rounded-md p-5 hover:shadow-md transition-all border-l-4 ${
                stat.gradient === "gradient-blue" ? "border-l-primary" :
                stat.gradient === "gradient-green" ? "border-l-bosch-green" :
                stat.gradient === "gradient-purple" ? "border-l-bosch-purple" :
                "border-l-bosch-turquoise"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</p>
                <div className={`w-9 h-9 rounded-md ${
                  stat.gradient === "gradient-blue" ? "bg-primary/10 text-primary" :
                  stat.gradient === "gradient-green" ? "bg-bosch-green/10 text-bosch-green" :
                  stat.gradient === "gradient-purple" ? "bg-bosch-purple/10 text-bosch-purple" :
                  "bg-bosch-turquoise/10 text-bosch-turquoise"
                } flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary bg-primary">
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Source Name</th>
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Type</th>
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Topic</th>
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Uploaded</th>
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Status</th>
                  <th className="text-right text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((source, i) => (
                  <motion.tr
                    key={source.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{source.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted-foreground">{source.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <TopicBadge topic={source.topic} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {source.uploadDate}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusIndicator status={source.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4 text-foreground uppercase tracking-wide">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: "Added", source: "Gartner AI Hype Cycle 2024", time: "2 hours ago", color: "bg-bosch-green" },
              { action: "Updated", source: "Bloomberg Finance Data Feed", time: "5 hours ago", color: "bg-bosch-blue" },
              { action: "Removed", source: "Outdated Report Q2", time: "1 day ago", color: "bg-bosch-red" },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-colors">
                <div className={`w-2 h-2 rounded-full ${log.color} shrink-0`} />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{log.action}</span> {log.source}
                </span>
                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Webpage URL</label>
              <input
                type="url"
                placeholder="https://example.com/report"
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <MetadataFields />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
            >
              Cancel
            </button>
            <button className="px-5 py-2.5 text-sm rounded-xl gradient-blue text-primary-foreground hover:opacity-90 transition-all font-semibold shadow-colored">
              Add Source
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetadataFields() {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          type="text"
          placeholder="Source title"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          placeholder="Brief description…"
          rows={2}
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Topic</label>
          <select className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
            <option>AI</option>
            <option>Sports</option>
            <option>Finance</option>
            <option>Technology</option>
            <option>General</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Tags</label>
          <input
            type="text"
            placeholder="tag1, tag2"
            className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

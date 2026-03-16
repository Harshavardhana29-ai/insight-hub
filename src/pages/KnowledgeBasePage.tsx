import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Globe, Filter, Trash2, Clock,
  Database, Tag, X,
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
  tags: string[];
  uploadDate: string;
  status: string;
}

const PREDEFINED_TOPICS = ["AI", "Sports", "Finance", "Technology", "General", "Healthcare", "Energy", "Automotive"];
const PREDEFINED_TAGS = ["Research", "News", "Analytics", "API", "Report", "Academic", "Real-time", "Historical", "Trends", "Market Data", "Open Source", "Enterprise"];

const mockSources: KnowledgeSource[] = [
  { id: "1", name: "Gartner AI Hype Cycle 2024", type: "URL", topic: "AI", tags: ["Research", "Trends"], uploadDate: "2024-03-15", status: "Active" },
  { id: "2", name: "https://techcrunch.com/ai-trends", type: "URL", topic: "Technology", tags: ["News", "Real-time"], uploadDate: "2024-03-14", status: "Active" },
  { id: "3", name: "Bloomberg Finance Data Feed", type: "URL", topic: "Finance", tags: ["API", "Market Data", "Real-time"], uploadDate: "2024-03-12", status: "Active" },
  { id: "4", name: "ESPN Sports Analytics", type: "URL", topic: "Sports", tags: ["Analytics", "Real-time"], uploadDate: "2024-03-10", status: "Processing" },
  { id: "5", name: "McKinsey Industry Insights", type: "URL", topic: "General", tags: ["Report", "Enterprise"], uploadDate: "2024-03-08", status: "Active" },
  { id: "6", name: "OpenAI Research Papers", type: "URL", topic: "AI", tags: ["Academic", "Research", "Open Source"], uploadDate: "2024-03-05", status: "Error" },
];

const stats = [
  { label: "Total Sources", value: "24", change: "+3 this week", icon: Database, gradient: "gradient-blue" },
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
              {PREDEFINED_TOPICS.map(t => <option key={t}>{t}</option>)}
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ y: -2, boxShadow: "0 8px 24px -8px hsl(220 20% 10% / 0.12)" }}
              className={`bg-card border border-border rounded-md p-4 transition-all border-l-4 ${
                stat.gradient === "gradient-blue" ? "border-l-primary" : "border-l-bosch-turquoise"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-md ${
                  stat.gradient === "gradient-blue" ? "bg-primary/10 text-primary" : "bg-bosch-turquoise/10 text-bosch-turquoise"
                } flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-auto">{stat.change}</p>
              </div>
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
                  <th className="text-left text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Tags</th>
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
                      <div className="flex flex-wrap gap-1">
                        {source.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent rounded-md text-[11px] font-medium text-accent-foreground">
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
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
                      <button
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
          </DialogHeader>
          <CreateSourceForm onClose={() => setShowUploadModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateSourceForm({ onClose }: { onClose: () => void }) {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const filteredTopics = PREDEFINED_TOPICS.filter(t =>
    t.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredTags = PREDEFINED_TAGS.filter(t =>
    t.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(t)
  );

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setTopicSearch("");
    setShowTopicDropdown(false);
  };

  const handleAddCustomTopic = () => {
    if (customTopic.trim()) {
      setSelectedTopic(customTopic.trim());
      setCustomTopic("");
    }
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearch("");
    setShowTagDropdown(false);
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <label className="text-sm font-medium text-foreground">Webpage URL</label>
        <input
          type="url"
          placeholder="https://example.com/report"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
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

      {/* Topic Selection */}
      <div>
        <label className="text-sm font-medium text-foreground">Topic</label>
        <div className="relative mt-1.5">
          {selectedTopic ? (
            <div className="flex items-center gap-2">
              <TopicBadge topic={selectedTopic} />
              <button onClick={() => setSelectedTopic("")} className="p-1 hover:bg-accent rounded-md transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => { setTopicSearch(e.target.value); setShowTopicDropdown(true); }}
                onFocus={() => setShowTopicDropdown(true)}
                placeholder="Search or select a topic…"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {showTopicDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredTopics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {topic}
                    </button>
                  ))}
                  {topicSearch.trim() && !PREDEFINED_TOPICS.some(t => t.toLowerCase() === topicSearch.toLowerCase()) && (
                    <button
                      onClick={() => { handleSelectTopic(topicSearch.trim()); }}
                      className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-accent transition-colors border-t border-border"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                      Create "{topicSearch.trim()}"
                    </button>
                  )}
                  {filteredTopics.length === 0 && !topicSearch.trim() && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No topics found</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tags Selection */}
      <div>
        <label className="text-sm font-medium text-foreground">Tags</label>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
            {selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent rounded-lg text-xs font-medium text-accent-foreground">
                <Tag className="w-3 h-3" />
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative mt-1.5">
          <input
            type="text"
            value={tagSearch}
            onChange={(e) => { setTagSearch(e.target.value); setShowTagDropdown(true); }}
            onFocus={() => setShowTagDropdown(true)}
            placeholder="Search or add tags…"
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {showTagDropdown && (tagSearch || filteredTags.length > 0) && (
            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {tag}
                </button>
              ))}
              {tagSearch.trim() && !PREDEFINED_TAGS.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && !selectedTags.includes(tagSearch.trim()) && (
                <button
                  onClick={() => { handleAddTag(tagSearch.trim()); }}
                  className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-accent transition-colors border-t border-border"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                  Add "{tagSearch.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
        >
          Cancel
        </button>
        <button className="px-5 py-2.5 text-sm rounded-xl gradient-blue text-primary-foreground hover:opacity-90 transition-all font-semibold shadow-colored">
          Add Source
        </button>
      </div>
    </div>
  );
}

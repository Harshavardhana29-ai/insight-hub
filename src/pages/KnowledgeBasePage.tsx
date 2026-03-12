import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Link as LinkIcon,
  FileText,
  Globe,
  Upload,
  X,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  Clock,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KnowledgeSource {
  id: string;
  name: string;
  type: "URL" | "Report" | "API";
  topic: string;
  uploadDate: string;
  status: string;
}

const mockSources: KnowledgeSource[] = [
  { id: "1", name: "Gartner AI Hype Cycle 2024", type: "Report", topic: "AI", uploadDate: "2024-03-15", status: "Active" },
  { id: "2", name: "https://techcrunch.com/ai-trends", type: "URL", topic: "Technology", uploadDate: "2024-03-14", status: "Active" },
  { id: "3", name: "Bloomberg Finance API", type: "API", topic: "Finance", uploadDate: "2024-03-12", status: "Active" },
  { id: "4", name: "ESPN Sports Analytics", type: "URL", topic: "Sports", uploadDate: "2024-03-10", status: "Processing" },
  { id: "5", name: "McKinsey Quarterly Report", type: "Report", topic: "General", uploadDate: "2024-03-08", status: "Active" },
  { id: "6", name: "OpenAI Research Papers", type: "URL", topic: "AI", uploadDate: "2024-03-05", status: "Error" },
];

const typeIcons: Record<string, typeof LinkIcon> = {
  URL: Globe,
  Report: FileText,
  API: LinkIcon,
};

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
    <>
      <AppHeader title="Knowledge Base" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge sources…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Data Source
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Sources", value: "24", change: "+3 this week" },
              { label: "Active", value: "19", change: "79% uptime" },
              { label: "Processing", value: "3", change: "~2 min avg" },
              { label: "Topics", value: "5", change: "Covered" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-2xl font-semibold mt-1 text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Source Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Topic</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Uploaded</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((source, i) => {
                    const TypeIcon = typeIcons[source.type] || Globe;
                    return (
                      <motion.tr
                        key={source.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{source.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{source.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <TopicBadge topic={source.topic} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {source.uploadDate}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusIndicator status={source.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: "Added", source: "Gartner AI Hype Cycle 2024", time: "2 hours ago" },
                { action: "Updated", source: "Bloomberg Finance API", time: "5 hours ago" },
                { action: "Removed", source: "Outdated Report Q2", time: "1 day ago" },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{log.action}</span> {log.source}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="url" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="url" className="flex-1">URL</TabsTrigger>
              <TabsTrigger value="report" className="flex-1">Report Upload</TabsTrigger>
              <TabsTrigger value="api" className="flex-1">API Source</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground">Webpage URL</label>
                <input type="url" placeholder="https://example.com/report" className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <MetadataFields />
            </TabsContent>

            <TabsContent value="report" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, CSV — Max 50MB</p>
              </div>
              <MetadataFields />
            </TabsContent>

            <TabsContent value="api" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground">API Endpoint</label>
                <input type="url" placeholder="https://api.example.com/data" className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">API Key</label>
                <input type="password" placeholder="Bearer token or API key" className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <MetadataFields />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-muted-foreground">Cancel</button>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Add Source</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetadataFields() {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-foreground">Title</label>
        <input type="text" placeholder="Source title" className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea placeholder="Brief description…" rows={2} className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Topic</label>
          <select className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring">
            <option>AI</option>
            <option>Sports</option>
            <option>Finance</option>
            <option>Technology</option>
            <option>General</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Tags</label>
          <input type="text" placeholder="tag1, tag2" className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg bg-accent border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
    </div>
  );
}

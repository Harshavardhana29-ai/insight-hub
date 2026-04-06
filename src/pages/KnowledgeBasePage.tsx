import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Globe, Filter, Trash2, Clock,
  Database, Tag, X, Loader2, Pencil, Download, GlobeLock,
} from "lucide-react";
import { TopicBadge } from "@/components/ui/TopicBadge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useDataSources, useDataSourceStats, useActivityLog,
  useTopics, useTags, useCreateDataSource, useUpdateDataSource, useDeleteDataSource,
} from "@/hooks/use-data-sources";
import type { DataSourceResponse } from "@/lib/api";
import { dataSourcesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin, isAdminOrAbove, isAssignedUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boschBlue, boschGreen } from "@/lib/bosch-colors";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSourceResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "public">("mine");
  const { toast } = useToast();
  const qc = useQueryClient();

  const showPublicTab = user && isAssignedUser(user);
  const canSetPublic = user && isSuperAdmin(user);

  const { data: sourcesData, isLoading } = useDataSources({
    search: searchQuery || undefined,
    topic: topicFilter !== "All" ? topicFilter : undefined,
    page,
    page_size: PAGE_SIZE,
  });
  const { data: statsData } = useDataSourceStats();
  const { data: activityLog } = useActivityLog();
  const { data: topicsList } = useTopics();
  const deleteMutation = useDeleteDataSource();

  const { data: publicSourcesData, isLoading: publicLoading } = useQuery({
    queryKey: ["public-data-sources", searchQuery, topicFilter],
    queryFn: () => dataSourcesApi.listPublic({
      search: searchQuery || undefined,
      topic: topicFilter !== "All" ? topicFilter : undefined,
    }),
    enabled: activeTab === "public" && !!showPublicTab,
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => dataSourcesApi.syncPublic(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      qc.invalidateQueries({ queryKey: ["data-sources-stats"] });
      toast({ title: "Public data source synced to your collection" });
    },
    onError: () => {
      toast({ title: "Failed to sync", variant: "destructive" });
    },
  });

  const sources = activeTab === "public"
    ? (publicSourcesData?.items ?? [])
    : (sourcesData?.items ?? []);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Data source removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const statCards = [
    { label: "Total Sources", value: String(statsData?.total_sources ?? 0), change: `${sourcesData?.total ?? 0} shown`, icon: Database, gradient: "gradient-blue" },
    { label: "Topics", value: String(statsData?.topic_count ?? 0), change: "Covered", icon: Tag, gradient: "gradient-blue-dark" },
  ];

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
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search knowledge sources…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={topicFilter}
              onChange={(e) => { setTopicFilter(e.target.value); setPage(1); }}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>All</option>
              {(topicsList ?? []).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {activeTab === "mine" && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 gradient-blue text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-colored"
            >
              <Plus className="w-4 h-4" />
              Add Data Source
            </button>
          )}
        </div>

        {/* Tabs for Admin: My Sources / Public Sources */}
        {showPublicTab && (
          <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                activeTab === "mine"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              My Sources
            </button>
            <button
              onClick={() => setActiveTab("public")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                activeTab === "public"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GlobeLock className="w-3.5 h-3.5" />
              Public Sources
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ y: -2, boxShadow: "0 8px 24px -8px hsl(220 20% 10% / 0.12)" }}
              className="bg-card border border-border rounded-md p-4 transition-all border-l-4 border-l-primary"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
                  
                  <th className="text-right text-xs font-semibold text-primary-foreground px-5 py-3.5 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                     <td colSpan={6} className="px-5 py-12 text-center">
                       <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                       <p className="text-sm text-muted-foreground mt-2">Loading data sources…</p>
                     </td>
                   </tr>
                 ) : sources.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="px-5 py-12 text-center">
                      <Database className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No data sources found</p>
                    </td>
                  </tr>
                ) : (
                  sources.map((source, i) => (
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
                        <span className="text-sm font-medium text-foreground truncate">{source.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted-foreground">{source.url ? "URL" : "File"}</span>
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
                        {source.created_at ? new Date(source.created_at).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {source.is_public && activeTab === "mine" && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold mr-1"
                            style={{ backgroundColor: boschGreen[95], color: boschGreen[50] }}
                          >
                            Public
                          </span>
                        )}
                        {activeTab === "public" ? (
                          <button
                            onClick={() => syncMutation.mutate(source.id)}
                            disabled={syncMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
                            style={{ backgroundColor: boschBlue[50] }}
                            title="Sync to my collection"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Sync
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingSource(source)}
                              className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(source.id)}
                              disabled={deleteMutation.isPending}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {activeTab === "mine" && sourcesData && (
          <Pagination
            page={sourcesData.page}
            totalPages={sourcesData.pages}
            total={sourcesData.total}
            pageSize={sourcesData.page_size}
            onPageChange={setPage}
          />
        )}

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4 text-foreground uppercase tracking-wide">Recent Activity</h3>
          <div className="space-y-3">
            {(activityLog ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No recent activity</p>
            ) : (
              (activityLog ?? []).map((log, i) => (
                <div key={i} className="flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${log.color} shrink-0`} />
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{log.action}</span> {log.source}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                </div>
              ))
            )}
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

      {/* Edit Modal */}
      <Dialog open={!!editingSource} onOpenChange={(open) => { if (!open) setEditingSource(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Source</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <EditSourceForm
              source={editingSource}
              onClose={() => setEditingSource(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateSourceForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const canSetPublic = user && isSuperAdmin(user);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  const { data: predefinedTopics } = useTopics();
  const { data: predefinedTags } = useTags();
  const createMutation = useCreateDataSource();

  const allTopics = predefinedTopics ?? [];
  const allTags = predefinedTags ?? [];

  const filteredTopics = allTopics.filter(t =>
    t.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredTags = allTags.filter(t =>
    t.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(t)
  );

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setTopicSearch("");
    setShowTopicDropdown(false);
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearch("");
    setShowTagDropdown(false);
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!url.trim() || !title.trim() || !selectedTopic) {
      toast({ title: "Please fill in URL, Title, and Topic", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        topic: selectedTopic,
        tags: selectedTags,
        is_public: canSetPublic ? isPublic : undefined,
      });
      toast({ title: "Data source added successfully" });
      onClose();
    } catch {
      toast({ title: "Failed to add data source", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <label className="text-sm font-medium text-foreground">Webpage URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/report"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Source title"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
                  {topicSearch.trim() && !allTopics.some(t => t.toLowerCase() === topicSearch.toLowerCase()) && (
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
              {tagSearch.trim() && !allTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && !selectedTags.includes(tagSearch.trim()) && (
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

      {canSetPublic && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Public Data Source</p>
            <p className="text-xs text-muted-foreground">Make available for all admins to sync</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "" : "bg-muted-foreground/30"}`}
            style={{ backgroundColor: isPublic ? boschGreen[50] : undefined }}
          >
            <span className={`absolute top-0.5 ${isPublic ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full shadow transition-all`} />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="px-5 py-2.5 text-sm rounded-xl gradient-blue text-primary-foreground hover:opacity-90 transition-all font-semibold shadow-colored disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Adding…</span>
          ) : "Add Source"}
        </button>
      </div>
    </div>
  );
}

function EditSourceForm({ source, onClose }: { source: DataSourceResponse; onClose: () => void }) {
  const { user } = useAuth();
  const canSetPublic = user && isSuperAdmin(user);
  const [url, setUrl] = useState(source.url || "");
  const [title, setTitle] = useState(source.title || "");
  const [description, setDescription] = useState(source.description || "");
  const [selectedTopic, setSelectedTopic] = useState(source.topic || "");
  const [topicSearch, setTopicSearch] = useState("");
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(source.tags || []);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isPublic, setIsPublic] = useState(source.is_public ?? false);
  const { toast } = useToast();

  const { data: predefinedTopics } = useTopics();
  const { data: predefinedTags } = useTags();
  const updateMutation = useUpdateDataSource();

  const allTopics = predefinedTopics ?? [];
  const allTags = predefinedTags ?? [];

  const filteredTopics = allTopics.filter(t =>
    t.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredTags = allTags.filter(t =>
    t.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(t)
  );

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setTopicSearch("");
    setShowTopicDropdown(false);
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setTagSearch("");
    setShowTagDropdown(false);
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!url.trim() || !title.trim() || !selectedTopic) {
      toast({ title: "Please fill in URL, Title, and Topic", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: source.id,
        data: {
          url: url.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          topic: selectedTopic,
          tags: selectedTags,
          ...(canSetPublic ? { is_public: isPublic } : {}),
        },
      });
      toast({ title: "Data source updated successfully" });
      onClose();
    } catch {
      toast({ title: "Failed to update data source", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <label className="text-sm font-medium text-foreground">Webpage URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/report"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Source title"
          className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
                  {topicSearch.trim() && !allTopics.some(t => t.toLowerCase() === topicSearch.toLowerCase()) && (
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
              {tagSearch.trim() && !allTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && !selectedTags.includes(tagSearch.trim()) && (
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

      {canSetPublic && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Public Data Source</p>
            <p className="text-xs text-muted-foreground">Make available for all admins to sync</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "" : "bg-muted-foreground/30"}`}
            style={{ backgroundColor: isPublic ? boschGreen[50] : undefined }}
          >
            <span className={`absolute top-0.5 ${isPublic ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full shadow transition-all`} />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors text-muted-foreground font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="px-5 py-2.5 text-sm rounded-xl gradient-blue text-primary-foreground hover:opacity-90 transition-all font-semibold shadow-colored disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
          ) : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

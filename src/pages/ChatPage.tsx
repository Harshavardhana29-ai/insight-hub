import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  ChevronDown,
  Plus,
  Search,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TopicBadge } from "@/components/ui/TopicBadge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  topic: string;
  lastMessage: string;
  timestamp: Date;
  unread?: boolean;
}

const mockConversations: Conversation[] = [
  { id: "1", title: "AI Market Analysis 2024", topic: "AI", lastMessage: "The AI market is projected to reach...", timestamp: new Date(), unread: true },
  { id: "2", title: "Sports Sponsorship Trends", topic: "Sports", lastMessage: "Major sponsorship deals have shifted...", timestamp: new Date(Date.now() - 3600000) },
  { id: "3", title: "Fintech Disruption Report", topic: "Finance", lastMessage: "Key findings show that neobanks...", timestamp: new Date(Date.now() - 86400000) },
  { id: "4", title: "Semiconductor Supply Chain", topic: "Technology", lastMessage: "Supply chain resilience has improved...", timestamp: new Date(Date.now() - 172800000) },
];

const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "What are the latest trends in the AI market for 2024?",
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: "2",
    role: "assistant",
    content: `## AI Market Overview — 2024

The global AI market is projected to reach **$305 billion** by end of 2024, representing a 37% year-over-year growth.

### Key Trends

1. **Generative AI Adoption** — Enterprise adoption has accelerated, with 67% of Fortune 500 companies deploying GenAI solutions.

2. **Edge AI** — Processing at the edge is growing at 28% CAGR, driven by IoT and automotive applications.

3. **AI Regulation** — The EU AI Act is shaping global regulatory frameworks, with compliance becoming a market differentiator.

| Segment | Market Size | Growth |
|---------|------------|--------|
| GenAI | $67B | +52% |
| ML Ops | $28B | +34% |
| Computer Vision | $21B | +29% |
| NLP | $35B | +41% |

### Summary
The market is consolidating around foundational model providers while vertical-specific AI applications show the strongest growth trajectories.`,
    sources: [
      { title: "Gartner AI Report 2024", url: "#" },
      { title: "McKinsey AI Index", url: "#" },
      { title: "Stanford HAI Report", url: "#" },
    ],
    timestamp: new Date(),
  },
];

export default function ChatPage() {
  const [selectedConvo, setSelectedConvo] = useState("1");
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm processing your research query. This is a placeholder response that would come from the `POST /api/mra/chat` endpoint. The response would include structured research data, analysis, and relevant sources.",
        sources: [{ title: "Research Database", url: "#" }],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 2000);
  };

  const filteredConversations = mockConversations.filter(
    (c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Chat" />
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <div className="p-3 space-y-2">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-accent border-0 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filteredConversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  selectedConvo === convo.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate pr-2">{convo.title}</span>
                  {convo.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                  <TopicBadge topic={convo.topic} />
                  <span className="text-xs text-muted-foreground truncate">{convo.lastMessage}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Market Analysis 2024</span>
              <TopicBadge topic="AI" />
            </div>
            <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[720px] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3"
                        : "bg-card border border-border rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-primary">MRA Research Agent</span>
                      </div>
                    )}
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "assistant" ? "prose prose-sm max-w-none dark:prose-invert" : ""}`}>
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((s, i) => (
                            <a
                              key={i}
                              href={s.url}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {s.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">MRA is researching…</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0s" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.3s" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.6s" }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card px-6 py-4 shrink-0">
            <div className="flex items-end gap-3 max-w-[800px] mx-auto">
              <div className="flex-1 flex items-end gap-2 bg-accent rounded-xl px-4 py-3">
                <button className="p-1 text-muted-foreground hover:text-foreground shrink-0 mb-0.5">
                  <Paperclip className="w-4 h-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask the research agent…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[20px] max-h-[120px]"
                />
                <div className="flex items-center gap-2 shrink-0 mb-0.5">
                  <div className="relative">
                    <select className="appearance-none bg-background border border-border rounded-md px-2 py-1 text-xs pr-6 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring">
                      <option>All Topics</option>
                      <option>AI</option>
                      <option>Sports</option>
                      <option>Finance</option>
                      <option>Technology</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

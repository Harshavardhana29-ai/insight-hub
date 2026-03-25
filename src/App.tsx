import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatLayout } from "@/components/layout/ChatLayout";
import ChatPage from "@/pages/ChatPage";

const queryClient = new QueryClient();

const App = () => {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);

  const handleNewChat = useCallback(() => {
    setSelectedHistoryId(null);
    setChatKey(k => k + 1);
  }, []);

  const handleClearHistory = useCallback(() => {
    setSelectedHistoryId(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ChatLayout
          onSelectHistory={setSelectedHistoryId}
          selectedHistoryId={selectedHistoryId}
          onNewChat={handleNewChat}
        >
          <ChatPage
            key={chatKey}
            selectedHistoryId={selectedHistoryId}
            onClearHistory={handleClearHistory}
          />
        </ChatLayout>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

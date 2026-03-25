import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { SettingsModal } from "@/components/layout/SettingsModal";
import ChatPage from "@/pages/ChatPage";

const queryClient = new QueryClient();

const App = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    setSelectedHistoryId(null);
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
          onOpenSettings={() => setSettingsOpen(true)}
          onSelectHistory={setSelectedHistoryId}
          selectedHistoryId={selectedHistoryId}
          onNewChat={handleNewChat}
        >
          <ChatPage
            selectedHistoryId={selectedHistoryId}
            onClearHistory={handleClearHistory}
          />
        </ChatLayout>
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

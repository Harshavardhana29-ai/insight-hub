import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isAssignedUser } from "@/lib/auth";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { AssistantLayout } from "@/components/layout/AssistantLayout";
import ChatPage from "@/pages/ChatPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import RestrictedAccessPage from "@/pages/RestrictedAccessPage";
import { useCreateChatSession, useDeleteChatSession, useChatSession } from "@/hooks/use-chat";
import { useRecentSchedulerRuns } from "@/hooks/use-scheduler";

const queryClient = new QueryClient();

/** Wrapper that redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !isAssignedUser(user)) {
    return <RestrictedAccessPage />;
  }

  return <>{children}</>;
}

/** The authenticated main app shell */
function AuthenticatedApp() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cronReport, setCronReport] = useState<{
    title: string; date: string; workflow: string; report: string;
  } | null>(null);

  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();
  const { data: recentRuns = [] } = useRecentSchedulerRuns();
  const hasAutoCreated = useRef(false);

  // Fetch the active session detail so we can check if it's empty
  const { data: activeSessionData } = useChatSession(activeSessionId);

  // Silently delete the current session if it has no messages
  const cleanupEmptySession = useCallback(() => {
    if (activeSessionId && activeSessionData && activeSessionData.messages.length === 0) {
      deleteSession.mutate(activeSessionId);
    }
  }, [activeSessionId, activeSessionData, deleteSession]);

  // Auto-create a default session on first mount (like ChatGPT)
  useEffect(() => {
    if (hasAutoCreated.current) return;
    hasAutoCreated.current = true;
    createSession.mutateAsync().then((session) => {
      setActiveSessionId(session.id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = useCallback(async () => {
    // Clean up the current session if the user never sent a message
    cleanupEmptySession();
    setCronReport(null);
    try {
      const session = await createSession.mutateAsync();
      setActiveSessionId(session.id);
    } catch {
      setActiveSessionId(null);
    }
  }, [createSession, cleanupEmptySession]);

  const handleSelectSession = useCallback((id: string) => {
    // Clean up the current session if the user never sent a message
    cleanupEmptySession();
    setCronReport(null);
    setActiveSessionId(id);
  }, [cleanupEmptySession]);

  const handleSelectCronRun = useCallback((runId: string) => {
    setActiveSessionId(null);
    const run = recentRuns.find(r => r.id === runId);
    if (run?.report_markdown) {
      setCronReport({
        title: run.job_name,
        date: run.run_date,
        workflow: run.workflow,
        report: run.report_markdown,
      });
    }
  }, [recentRuns]);

  const handleClearCronReport = useCallback(() => {
    setCronReport(null);
  }, []);

  return (
    <ChatLayout
      activeSessionId={activeSessionId}
      onSelectSession={handleSelectSession}
      onNewChat={handleNewChat}
      onSelectCronRun={handleSelectCronRun}
    >
      <ChatPage
        sessionId={activeSessionId}
        cronReport={cronReport}
        onClearCronReport={handleClearCronReport}
      />
    </ChatLayout>
  );
}

/** App content with routes — inside BrowserRouter */
function AppContent() {
  const { user } = useAuth();
  const isAssistant = user?.role === "assistant";

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            {isAssistant ? <AssistantLayout /> : <AuthenticatedApp />}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

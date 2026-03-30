import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChatLayout } from "@/components/layout/ChatLayout";
import ChatPage from "@/pages/ChatPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";

const queryClient = new QueryClient();

/** Wrapper that redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

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

  return <>{children}</>;
}

/** The authenticated main app shell */
function AuthenticatedApp() {
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
  );
}

/** App content with routes — inside BrowserRouter */
function AppContent() {
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
            <AuthenticatedApp />
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

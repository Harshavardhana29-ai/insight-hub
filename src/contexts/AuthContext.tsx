import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  type AuthUser,
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
  hasSession,
  getMe,
  ssoLogout,
  backendLogout,
  syncWithBackend,
  getMcpSessionId,
  getSSOUserInfo,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Called from AuthCallbackPage after MCP SSO callback completes */
  completeLogin: (mcpSessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    // Skip if on callback page
    if (window.location.pathname === "/auth/callback") {
      setIsLoading(false);
      return;
    }

    // Check if we have a stored token
    if (!getStoredToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  /**
   * Complete the login flow after SSO callback.
   * Takes the MCP session_id, syncs with our backend to create a local user + JWT.
   */
  const completeLogin = async (mcpSessionId: string) => {
    const response = await syncWithBackend(mcpSessionId);
    storeAuth(response.access_token, response.user);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await backendLogout();
      await ssoLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!getStoredToken(),
        isLoading,
        logout,
        refreshUser,
        completeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

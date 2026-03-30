/**
 * MCP SSO Service + Local Auth — Production Grade Authentication
 * Same SSO flow as myfinance, plus local JWT session management
 */

const MCP_BASE = import.meta.env.VITE_MCP_BASE;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

// ==================== Storage Keys ====================

const MCP_SESSION_KEY = "mcp_session_id";
const TOKEN_KEY = "mra_access_token";
const USER_KEY = "mra_user";

// ==================== MCP Session Storage ====================

export function getMcpSessionId(): string | null {
  return localStorage.getItem(MCP_SESSION_KEY);
}

export function setMcpSessionId(sessionId: string): void {
  localStorage.setItem(MCP_SESSION_KEY, sessionId);
}

export function clearMcpSessionId(): void {
  localStorage.removeItem(MCP_SESSION_KEY);
}

export function hasMcpSession(): boolean {
  return !!getMcpSessionId();
}

// ==================== App Token Storage ====================

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(MCP_SESSION_KEY);
}

export function hasSession(): boolean {
  return !!getStoredToken() && hasMcpSession();
}

// ==================== Type Definitions ====================

export interface LoginResponse {
  auth_url: string;
  session_id?: string;
  error?: string;
  message?: string;
}

export interface CallbackResponse {
  status: string;
  session_id: string;
  backend?: {
    status: string;
    message: string;
  };
  error?: string;
  message?: string;
}

export interface SSOUserInfo {
  sub: string;
  email: string;
  name: string;
  ntid: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
}

export interface UserInfoResponse {
  user?: SSOUserInfo;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  sso_id: string;
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

// ==================== MCP SSO API Functions ====================

/**
 * Step 1: Start SSO login — get auth URL from MCP SSO service
 */
export async function startLogin(): Promise<LoginResponse> {
  try {
    const response = await fetch(`${MCP_BASE}/sso/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uri: REDIRECT_URI }),
    });

    const data: LoginResponse = await response.json();

    if (data.error) {
      throw new Error(data.message || "Failed to start login");
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Step 2: Handle OAuth callback — exchange code for MCP session
 */
export async function handleSSOCallback(code: string, state: string): Promise<CallbackResponse> {
  try {
    const response = await fetch(`${MCP_BASE}/sso/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, session_id: getMcpSessionId() }),
    });

    const data: CallbackResponse = await response.json();

    if (data.error) {
      throw new Error(data.message || "Callback failed");
    }

    // Store MCP session ID
    if (data.session_id) {
      setMcpSessionId(data.session_id);
    }

    return data;
  } catch (error) {
    console.error("Callback error:", error);
    throw error;
  }
}

/**
 * Step 3: Get user information from MCP SSO using session
 */
export async function getSSOUserInfo(): Promise<SSOUserInfo> {
  const sessionId = getMcpSessionId();

  if (!sessionId) {
    throw new Error("No MCP session ID available");
  }

  try {
    const response = await fetch(
      `${MCP_BASE}/sso/me?session_id=${encodeURIComponent(sessionId)}`
    );

    const data: UserInfoResponse = await response.json();

    if (data.error) {
      clearMcpSessionId();
      throw new Error(data.message || "Failed to get user info");
    }

    if (!data.user || !data.user.sub) {
      throw new Error("Invalid user data received");
    }

    return data.user;
  } catch (error) {
    console.error("Get user info error:", error);
    throw error;
  }
}

/**
 * SSO Logout — clear MCP session
 */
export async function ssoLogout(): Promise<void> {
  const sessionId = getMcpSessionId();

  try {
    if (sessionId) {
      await fetch(`${MCP_BASE}/sso/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    }
  } catch (error) {
    console.error("SSO logout error:", error);
  }
}

// ==================== Backend Auth API ====================

/**
 * Step 4: After SSO callback, sync user with our backend.
 * Backend verifies via MCP /sso/me, upserts user, creates local session.
 */
export async function syncWithBackend(mcpSessionId: string): Promise<AuthTokenResponse> {
  const response = await fetch(`${API_BASE}/auth/sso/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mcp_session_id: mcpSessionId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Backend sync failed");
  }

  return response.json();
}

/**
 * Get current user profile from our backend
 */
export async function getMe(): Promise<AuthUser> {
  const token = getStoredToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      throw new Error("Session expired");
    }
    throw new Error("Failed to get user info");
  }

  return response.json();
}

/**
 * Backend logout — revoke local session
 */
export async function backendLogout(): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore — token might already be invalid
  }
}

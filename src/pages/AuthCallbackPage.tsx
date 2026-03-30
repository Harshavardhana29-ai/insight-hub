/**
 * Handles the SSO callback redirect.
 * URL: /auth/callback?code=xxx&state=yyy
 *
 * Flow (same as myfinance):
 * 1. Extract code + state from query string
 * 2. POST to MCP SSO /sso/callback to exchange for session_id
 * 3. Wait for session finalization
 * 4. GET MCP SSO /sso/me to confirm user info
 * 5. POST to our backend /api/auth/sso/sync to create local user + JWT
 * 6. Redirect to main app
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { handleSSOCallback, getSSOUserInfo, getMcpSessionId } from "@/lib/auth";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeLogin } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      // Handle error from SSO provider
      if (error) {
        setStatus("error");
        setMessage(`Authentication failed: ${error}`);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      // Validate required params
      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authentication parameters");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        // Step 1: Exchange code for MCP session
        setMessage("Verifying credentials...");
        await handleSSOCallback(code, state);

        // Step 2: Wait for backend to finalize session
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 3: Fetch user info from MCP to confirm auth
        setMessage("Loading your profile...");
        const userInfo = await getSSOUserInfo();

        // Step 4: Sync with our backend (upsert user + create local JWT)
        setMessage("Setting up your workspace...");
        const mcpSessionId = getMcpSessionId();
        if (!mcpSessionId) {
          throw new Error("No MCP session ID after callback");
        }
        await completeLogin(mcpSessionId);

        // Step 5: Success
        setStatus("success");
        setMessage(`Welcome, ${userInfo.name}!`);

        // Force full page reload to ensure AuthContext loads fresh
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Authentication failed");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, completeLogin]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Status Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {status === "loading" && (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              )}
              {status === "success" && (
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              )}
              {status === "error" && (
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-foreground">
              {status === "loading" && "Authenticating"}
              {status === "success" && "Success!"}
              {status === "error" && "Authentication Failed"}
            </h2>

            {/* Message */}
            <p className="text-sm text-muted-foreground">{message}</p>

            {/* Status-specific content */}
            {status === "error" && (
              <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Redirecting to login page...
              </div>
            )}
            {status === "success" && (
              <div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                Redirecting to dashboard...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

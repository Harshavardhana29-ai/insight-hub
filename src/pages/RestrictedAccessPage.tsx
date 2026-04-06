import { ShieldX, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { boschBlue, boschRed, boschGray } from "@/lib/bosch-colors";

export default function RestrictedAccessPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundColor: `${boschRed[95]}` }}
          >
            <ShieldX className="h-10 w-10" style={{ color: boschRed[50] }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Access Restricted
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your account has not been assigned a role yet. Please contact your
              administrator to request access to the Market Research Agentic Suite.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          {user && (
            <div className="text-left space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: boschGray[50] }}>
                Signed in as
              </p>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: boschBlue[50] }}
                >
                  {user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <a
              href="mailto:admin@bosch.com?subject=MRA%20Access%20Request"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: boschBlue[50] }}
            >
              <Mail className="h-4 w-4" />
              Contact Administrator
            </a>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          &copy; 2026 BGSW / BDO &mdash; Market Research Agentic Suite
        </p>
      </div>
    </div>
  );
}

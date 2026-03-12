import { AppHeader } from "@/components/layout/AppHeader";
import { User, Bell, Shield, Palette, Globe, Key } from "lucide-react";

const settingsSections = [
  { icon: User, title: "Profile", description: "Manage your account details and preferences" },
  { icon: Bell, title: "Notifications", description: "Configure email and in-app notifications" },
  { icon: Shield, title: "Security", description: "Password, two-factor authentication, sessions" },
  { icon: Palette, title: "Appearance", description: "Theme, layout, and display settings" },
  { icon: Globe, title: "Language & Region", description: "Set your language, timezone, and date format" },
  { icon: Key, title: "API Keys", description: "Manage API keys for external integrations" },
];

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.title}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-card border border-transparent hover:border-border transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <section.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{section.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

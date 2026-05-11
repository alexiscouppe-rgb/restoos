"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Search, LogOut, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface TopBarProps { user: SupabaseUser }

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "U";

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Mon compte";

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="flex h-13 items-center justify-between border-b border-border bg-background/90 backdrop-blur-xl px-5 flex-shrink-0 gap-4">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-sm">
        <button className="flex items-center gap-2.5 rounded-xl border border-input bg-muted/40 hover:bg-muted/70 px-3 py-2 text-sm text-muted-foreground w-full transition-all duration-150">
          <Search className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="text-[10px] font-mono border border-border/60 rounded-md px-1.5 py-0.5 bg-background text-muted-foreground/70">⌘K</kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors duration-150"
          aria-label="Changer le thème"
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 text-muted-foreground" />
            : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Notifications */}
        <button
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors duration-150"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-accent transition-colors duration-150"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-bold select-none">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:block">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 rounded-2xl border border-border bg-card shadow-lg shadow-black/8 z-50 overflow-hidden animate-scale-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>

              {/* Actions */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { setMenuOpen(false); router.push("/dashboard/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Paramètres
                </button>
              </div>

              <div className="p-1.5 pt-0">
                <div className="border-t border-border mb-1.5" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

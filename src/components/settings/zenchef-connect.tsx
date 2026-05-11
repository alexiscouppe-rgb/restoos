"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, AlertCircle, RefreshCw, Loader2, Link2, Copy, Users, Calendar,
} from "lucide-react";

interface ZenchefConnectProps {
  restaurantId: string;
  appUrl: string;
  integration: {
    is_active: boolean;
    settings?: { zenchef_restaurant_id?: string; webhook_url?: string };
    last_sync_at?: string;
  } | null;
}

export function ZenchefConnect({ restaurantId, appUrl, integration }: ZenchefConnectProps) {
  const isConnected = !!integration?.is_active;

  const [apiToken, setApiToken] = useState("");
  const [zenchefRestaurantId, setZenchefRestaurantId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<{
    reservations: { imported: number; skipped: number };
    contacts: { imported: number; skipped: number };
  } | null>(null);

  const webhookUrl = integration?.settings?.webhook_url ?? `${appUrl}/api/webhooks/zenchef`;

  async function handleConnect() {
    if (!apiToken || !zenchefRestaurantId) {
      toast.error("Remplis les deux champs");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/zenchef/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, apiToken, zenchefRestaurantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Zenchef connecté !");
      window.location.reload();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync(mode: "all" | "reservations" | "contacts") {
    setSyncing(mode);
    setSyncResults(null);
    try {
      const res = await fetch("/api/zenchef/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResults(data.results);
      const total = (data.results.reservations?.imported ?? 0) + (data.results.contacts?.imported ?? 0);
      toast.success(`${total} éléments synchronisés depuis Zenchef`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(null);
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL webhook copiée !");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a2e] text-white font-bold text-sm">
            Z
          </div>
          <div>
            <p className="font-semibold text-sm">Zenchef</p>
            <p className="text-xs text-muted-foreground">
              {isConnected
                ? `Restaurant ID : ${integration?.settings?.zenchef_restaurant_id}`
                : "Non connecté"}
            </p>
          </div>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" /> Inactif
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Trouve ton API token et Restaurant ID dans Zenchef → Paramètres → Partenaires.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">API Token</label>
              <input
                type="text"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="6da02d4a-dc5f-412c-be33-..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Restaurant ID</label>
              <input
                type="text"
                value={zenchefRestaurantId}
                onChange={(e) => setZenchefRestaurantId(e.target.value)}
                placeholder="382910"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {connecting ? "Connexion…" : "Connecter Zenchef"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sync buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: "all" as const, label: "Tout synchroniser", icon: RefreshCw },
              { mode: "reservations" as const, label: "Réservations", icon: Calendar },
              { mode: "contacts" as const, label: "Contacts", icon: Users },
            ].map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => handleSync(mode)}
                disabled={!!syncing}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60"
              >
                {syncing === mode
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Icon className="h-4 w-4 text-muted-foreground" />}
                {label}
              </button>
            ))}
          </div>

          {/* Résultats sync */}
          {syncResults && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm space-y-1">
              <p className="font-medium text-emerald-700">Synchronisation terminée</p>
              <p className="text-xs text-muted-foreground">
                Réservations : {syncResults.reservations.imported} importées · {syncResults.reservations.skipped} ignorées
              </p>
              <p className="text-xs text-muted-foreground">
                Contacts : {syncResults.contacts.imported} importés · {syncResults.contacts.skipped} ignorés
              </p>
            </div>
          )}

          {/* Webhook URL */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium">URL Webhook (pour les mises à jour temps réel)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhook}
                className="flex-shrink-0 rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Colle cette URL dans Zenchef → Paramètres → Partenaires → Webhook réservation
            </p>
          </div>

          {integration?.last_sync_at && (
            <p className="text-xs text-muted-foreground">
              Dernière sync : {new Date(integration.last_sync_at).toLocaleString("fr-FR")}
            </p>
          )}

          <button
            onClick={() => window.location.reload()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Modifier les credentials
          </button>
        </div>
      )}
    </div>
  );
}

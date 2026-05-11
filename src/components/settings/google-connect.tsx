"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, AlertCircle, RefreshCw, Loader2, ExternalLink, Zap, Settings2
} from "lucide-react";

interface GoogleConnectProps {
  restaurantId: string;
  integration: {
    is_active: boolean;
    settings?: { location_title?: string; location_id?: string; account_name?: string; auto_reply?: boolean };
    credentials?: { access_token?: string; expires_at?: string };
  } | null;
  autoReplyEnabled: boolean;
}

export function GoogleConnect({ restaurantId, integration, autoReplyEnabled }: GoogleConnectProps) {
  const [syncing, setSyncing] = useState(false);
  const [autoReply, setAutoReply] = useState(autoReplyEnabled);
  const [syncResult, setSyncResult] = useState<{ imported: number; total: number } | null>(null);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [accountName, setAccountName] = useState(integration?.settings?.account_name ?? "");
  const [locationId, setLocationId] = useState(integration?.settings?.location_id ?? "");
  const [locationTitle, setLocationTitle] = useState(integration?.settings?.location_title ?? "");
  const [savingConfig, setSavingConfig] = useState(false);

  const isConnected = !!integration?.is_active;
  const isConfigured = !!(integration?.settings?.account_name && integration?.settings?.location_id);

  function handleConnect() {
    window.location.href = `/api/auth/google?restaurantId=${restaurantId}`;
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/google/reviews/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult({ imported: data.imported, total: data.total });
      toast.success(`${data.imported} avis synchronisés depuis Google`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleAutoReply(enabled: boolean) {
    setAutoReply(enabled);
    await fetch("/api/settings/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, provider: "google", config: { auto_reply: enabled } }),
    });
    toast.success(enabled ? "Réponses IA automatiques activées" : "Réponses IA désactivées");
  }

  async function saveManualConfig() {
    if (!accountName || !locationId) {
      toast.error("Remplis Account Name et Location ID");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch("/api/google/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, accountName, locationId, locationTitle: locationTitle || "Le Chat" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Configuration enregistrée !");
      setShowManualConfig(false);
      window.location.reload();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-border shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">Google Business Profile</p>
            <p className="text-xs text-muted-foreground">
              {isConnected && isConfigured
                ? `Connecté · ${integration?.settings?.location_title ?? "Établissement"}`
                : isConnected
                ? "Connecté · configuration requise"
                : "Non connecté"}
            </p>
          </div>
        </div>

        {isConnected && isConfigured ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Actif
          </span>
        ) : isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
            <Settings2 className="h-3.5 w-3.5" /> À configurer
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
            Connectez votre Google Business Profile pour synchroniser vos avis et répondre automatiquement avec l'IA.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Connecter Google <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : !isConfigured || showManualConfig ? (
        /* Configuration manuelle */
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700">
            ⚠️ L'auto-détection de votre établissement a échoué (quota API). Configurez manuellement ci-dessous.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Account Name
                <span className="ml-1 font-normal">— trouvé via l'API ou dans l'URL business.google.com</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="accounts/123456789"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Location ID
                <span className="ml-1 font-normal">— dans l'URL de votre fiche Google Business</span>
              </label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="1234567890123456789"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Nom de l'établissement</label>
              <input
                type="text"
                value={locationTitle}
                onChange={(e) => setLocationTitle(e.target.value)}
                placeholder="Le Chat"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Comment trouver ces infos :</p>
              <p>1. Va sur <a href="https://business.google.com" target="_blank" className="underline text-primary">business.google.com</a></p>
              <p>2. Clique sur ton établissement "Le Chat"</p>
              <p>3. L'URL ressemble à : <code className="bg-background px-1 rounded">…/dashboard/l/LOCATION_ID</code></p>
              <p>4. Pour l'Account Name : utilise <code className="bg-background px-1 rounded">accounts/</code> + ton ID de compte Google</p>
            </div>

            <button
              onClick={saveManualConfig}
              disabled={savingConfig}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {savingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingConfig ? "Enregistrement…" : "Enregistrer la configuration"}
            </button>
          </div>

          {showManualConfig && (
            <button
              onClick={() => setShowManualConfig(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Annuler
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sync */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium">Synchroniser les avis</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {syncResult
                  ? `${syncResult.imported} importés sur ${syncResult.total}`
                  : "Importer tous vos avis Google récents"}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Sync…" : "Synchroniser"}
            </button>
          </div>

          {/* Auto-reply toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Réponses IA automatiques</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {autoReply ? "L'IA répond aux nouveaux avis automatiquement" : "Mode manuel — vous validez chaque réponse"}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleAutoReply(!autoReply)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoReply ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoReply ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleConnect}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Reconnecter le compte Google
            </button>
            <button
              onClick={() => setShowManualConfig(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Modifier la configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

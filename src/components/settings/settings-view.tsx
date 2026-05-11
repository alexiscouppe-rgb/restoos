"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Store, Utensils, Users, Brain, CreditCard,
  Plus, Trash2, Loader2, X, Crown, Shield,
  BookOpen, Zap, Check, ExternalLink, Plug
} from "lucide-react";
import type { Restaurant, RestaurantTable, Organization } from "@/lib/types";
import { ZenchefConnect } from "./zenchef-connect";
import { GoogleConnect } from "./google-connect";

interface SettingsViewProps {
  restaurant: Restaurant;
  tables: RestaurantTable[];
  members: any[];
  knowledge: any[];
  organization: Organization | null;
  currentUserId: string;
  currentUserRole: string;
  integrations?: Record<string, any>;
  appUrl?: string;
}

const TABS = [
  { id: "restaurant", label: "Restaurant", icon: Store },
  { id: "tables", label: "Tables", icon: Utensils },
  { id: "ai", label: "IA & Réponses", icon: Brain },
  { id: "team", label: "Équipe", icon: Users },
  { id: "integrations", label: "Intégrations", icon: Plug },
  { id: "billing", label: "Abonnement", icon: CreditCard },
] as const;

type TabId = typeof TABS[number]["id"];

export function SettingsView({
  restaurant: initialRestaurant,
  tables: initialTables,
  members,
  knowledge: initialKnowledge,
  organization,
  currentUserId,
  currentUserRole,
  integrations = {},
  appUrl = "http://localhost:3000",
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("restaurant");
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [tables, setTables] = useState(initialTables);
  const [knowledge, setKnowledge] = useState(initialKnowledge);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Configurez votre restaurant et votre compte
        </p>
      </div>

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "restaurant" && (
            <RestaurantSettings restaurant={restaurant} onUpdate={setRestaurant} />
          )}
          {activeTab === "tables" && (
            <TablesSettings
              tables={tables}
              restaurantId={restaurant.id}
              onUpdate={setTables}
            />
          )}
          {activeTab === "ai" && (
            <AISettings
              restaurant={restaurant}
              knowledge={knowledge}
              onUpdateRestaurant={setRestaurant}
              onUpdateKnowledge={setKnowledge}
            />
          )}
          {activeTab === "team" && (
            <TeamSettings members={members} restaurantId={restaurant.id} currentUserId={currentUserId} currentUserRole={currentUserRole} />
          )}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Intégrations</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Connectez vos outils externes pour centraliser toutes vos données.</p>
              </div>
              <ZenchefConnect
                restaurantId={restaurant.id}
                appUrl={appUrl}
                integration={integrations.zenchef ?? null}
              />
              <GoogleConnect
                restaurantId={restaurant.id}
                integration={integrations.google ?? null}
                autoReplyEnabled={integrations.google?.settings?.auto_reply ?? false}
              />
            </div>
          )}
          {activeTab === "billing" && (
            <BillingSettings organization={organization} restaurantId={restaurant.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Restaurant Settings ───────────────────────────────────────────────────────
function RestaurantSettings({ restaurant, onUpdate }: { restaurant: Restaurant; onUpdate: (r: Restaurant) => void }) {
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description ?? "",
    cuisine_type: restaurant.cuisine_type ?? "",
    address: restaurant.address ?? "",
    city: restaurant.city ?? "",
    phone: restaurant.phone ?? "",
    email: restaurant.email ?? "",
    website: restaurant.website ?? "",
    timezone: restaurant.timezone,
    reservation_duration_minutes: restaurant.reservation_duration_minutes,
    max_party_size: restaurant.max_party_size,
    booking_lead_time_hours: restaurant.booking_lead_time_hours,
    booking_advance_days: restaurant.booking_advance_days,
  });
  const [saving, setSaving] = useState(false);

  function update(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        name: form.name,
        description: form.description || null,
        cuisine_type: form.cuisine_type || null,
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        timezone: form.timezone,
        reservation_duration_minutes: form.reservation_duration_minutes,
        max_party_size: form.max_party_size,
        booking_lead_time_hours: form.booking_lead_time_hours,
        booking_advance_days: form.booking_advance_days,
      })
      .eq("id", restaurant.id)
      .select()
      .single();

    if (error) toast.error("Erreur lors de la sauvegarde");
    else { onUpdate(data as Restaurant); toast.success("Paramètres sauvegardés ✓"); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card title="Informations générales">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom du restaurant *">
            <input value={form.name} onChange={e => update("name", e.target.value)}
              className="input" placeholder="Le Petit Bistrot" />
          </Field>
          <Field label="Type de cuisine">
            <input value={form.cuisine_type} onChange={e => update("cuisine_type", e.target.value)}
              className="input" placeholder="Française, Italienne…" />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={e => update("description", e.target.value)}
            className="input resize-none" rows={3}
            placeholder="Décrivez votre restaurant en quelques mots…" />
        </Field>
      </Card>

      <Card title="Coordonnées">
        <Field label="Adresse">
          <input value={form.address} onChange={e => update("address", e.target.value)}
            className="input" placeholder="12 rue de la Paix" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ville">
            <input value={form.city} onChange={e => update("city", e.target.value)}
              className="input" placeholder="Paris" />
          </Field>
          <Field label="Fuseau horaire">
            <select value={form.timezone} onChange={e => update("timezone", e.target.value)} className="input">
              <option value="Europe/Paris">Europe/Paris (UTC+1/2)</option>
              <option value="Europe/London">Europe/London (UTC+0/1)</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone">
            <input value={form.phone} onChange={e => update("phone", e.target.value)}
              className="input" placeholder="01 23 45 67 89" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
              className="input" placeholder="contact@restaurant.fr" />
          </Field>
        </div>
        <Field label="Site web">
          <input value={form.website} onChange={e => update("website", e.target.value)}
            className="input" placeholder="https://monrestaurant.fr" />
        </Field>
      </Card>

      <Card title="Paramètres réservations">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Durée par défaut (min)">
            <input type="number" min={30} max={300} step={15}
              value={form.reservation_duration_minutes}
              onChange={e => update("reservation_duration_minutes", parseInt(e.target.value))}
              className="input" />
          </Field>
          <Field label="Taille groupe max">
            <input type="number" min={1} max={100}
              value={form.max_party_size}
              onChange={e => update("max_party_size", parseInt(e.target.value))}
              className="input" />
          </Field>
          <Field label="Délai réservation min (h)">
            <input type="number" min={0} max={72}
              value={form.booking_lead_time_hours}
              onChange={e => update("booking_lead_time_hours", parseInt(e.target.value))}
              className="input" />
          </Field>
          <Field label="Réservation jusqu'à (jours)">
            <input type="number" min={7} max={365}
              value={form.booking_advance_days}
              onChange={e => update("booking_advance_days", parseInt(e.target.value))}
              className="input" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

// ─── Tables Settings ───────────────────────────────────────────────────────────
function TablesSettings({
  tables,
  restaurantId,
  onUpdate,
}: {
  tables: RestaurantTable[];
  restaurantId: string;
  onUpdate: (t: RestaurantTable[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTable, setNewTable] = useState({ name: "", capacity: 4, section: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function addTable() {
    if (!newTable.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .insert({
        restaurant_id: restaurantId,
        name: newTable.name.trim(),
        capacity: newTable.capacity,
        min_capacity: 1,
        section: newTable.section || null,
      })
      .select()
      .single();

    if (error) toast.error("Erreur lors de la création");
    else {
      onUpdate([...tables, data as RestaurantTable]);
      setNewTable({ name: "", capacity: 4, section: "" });
      setShowAdd(false);
      toast.success("Table ajoutée ✓");
    }
    setSaving(false);
  }

  async function deleteTable(id: string) {
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { onUpdate(tables.filter(t => t.id !== id)); toast.success("Table supprimée"); }
    setDeleting(null);
  }

  const sections = [...new Set(tables.map(t => t.section).filter(Boolean))];

  return (
    <div className="space-y-4">
      <Card title={`Plan de salle — ${tables.length} table${tables.length !== 1 ? "s" : ""}`}
        action={
          <button onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        }>
        {showAdd && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nom">
                <input value={newTable.name} onChange={e => setNewTable(p => ({ ...p, name: e.target.value }))}
                  className="input" placeholder="Table 1" autoFocus />
              </Field>
              <Field label="Capacité">
                <input type="number" min={1} max={50} value={newTable.capacity}
                  onChange={e => setNewTable(p => ({ ...p, capacity: parseInt(e.target.value) }))}
                  className="input" />
              </Field>
              <Field label="Section">
                <input value={newTable.section} onChange={e => setNewTable(p => ({ ...p, section: e.target.value }))}
                  className="input" placeholder="Salle, Terrasse…" />
              </Field>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent">
                Annuler
              </button>
              <button onClick={addTable} disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Ajouter
              </button>
            </div>
          </div>
        )}

        {tables.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Aucune table configurée. Ajoutez votre plan de salle.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tables.map(table => (
              <div key={table.id} className="flex items-center justify-between py-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold text-foreground">
                    {table.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{table.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {table.capacity} couverts{table.section ? ` · ${table.section}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteTable(table.id)}
                  disabled={!!deleting}
                  className="rounded-lg p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  {deleting === table.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── AI Settings ──────────────────────────────────────────────────────────────
function AISettings({
  restaurant,
  knowledge,
  onUpdateRestaurant,
  onUpdateKnowledge,
}: {
  restaurant: Restaurant;
  knowledge: any[];
  onUpdateRestaurant: (r: Restaurant) => void;
  onUpdateKnowledge: (k: any[]) => void;
}) {
  const [aiEnabled, setAiEnabled] = useState(restaurant.ai_enabled);
  const [autoReply, setAutoReply] = useState(restaurant.auto_reply_enabled);
  const [personality, setPersonality] = useState(restaurant.ai_personality ?? "");
  const [saving, setSaving] = useState(false);
  const [showAddChunk, setShowAddChunk] = useState(false);
  const [newChunk, setNewChunk] = useState({ category: "menu", title: "", content: "" });
  const [addingChunk, setAddingChunk] = useState(false);

  async function saveAI() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        ai_enabled: aiEnabled,
        auto_reply_enabled: autoReply,
        ai_personality: personality || null,
      })
      .eq("id", restaurant.id)
      .select()
      .single();

    if (error) toast.error("Erreur");
    else { onUpdateRestaurant(data as Restaurant); toast.success("Paramètres IA sauvegardés ✓"); }
    setSaving(false);
  }

  async function addChunk() {
    if (!newChunk.title.trim() || !newChunk.content.trim()) return;
    setAddingChunk(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_knowledge_chunks")
      .insert({
        restaurant_id: restaurant.id,
        category: newChunk.category,
        title: newChunk.title.trim(),
        content: newChunk.content.trim(),
      })
      .select()
      .single();

    if (error) toast.error("Erreur lors de l'ajout");
    else {
      onUpdateKnowledge([...knowledge, data]);
      setNewChunk({ category: "menu", title: "", content: "" });
      setShowAddChunk(false);
      toast.success("Connaissance ajoutée ✓");
    }
    setAddingChunk(false);
  }

  async function deleteChunk(id: string) {
    const supabase = createClient();
    await supabase.from("ai_knowledge_chunks").delete().eq("id", id);
    onUpdateKnowledge(knowledge.filter(k => k.id !== id));
    toast.success("Supprimé");
  }

  const CATEGORIES = [
    { value: "menu", label: "🍽️ Menu & plats" },
    { value: "horaires", label: "🕐 Horaires" },
    { value: "politique", label: "📋 Politiques" },
    { value: "info", label: "ℹ️ Infos pratiques" },
    { value: "ambiance", label: "🎵 Ambiance & cadre" },
    { value: "autre", label: "📌 Autre" },
  ];

  return (
    <div className="space-y-5">
      <Card title="Paramètres IA">
        <div className="space-y-4">
          <Toggle
            label="Activer l'assistant IA"
            description="L'IA peut suggérer des réponses aux messages entrants"
            checked={aiEnabled}
            onChange={setAiEnabled}
          />
          <Toggle
            label="Réponses automatiques"
            description="L'IA répond automatiquement aux messages simples (hors réservations)"
            checked={autoReply}
            onChange={setAutoReply}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">Personnalité de l'IA</label>
          <textarea
            value={personality}
            onChange={e => setPersonality(e.target.value)}
            className="input resize-none"
            rows={3}
            placeholder="Ex: Chaleureux et professionnel, avec une touche d'humour. Toujours proposer des recommandations personnalisées basées sur les préférences du client."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Décrivez comment l'IA doit se comporter avec vos clients.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={saveAI} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Sauvegarder
          </button>
        </div>
      </Card>

      {/* Knowledge base */}
      <Card
        title={`Base de connaissance — ${knowledge.length} entrée${knowledge.length !== 1 ? "s" : ""}`}
        description="L'IA utilise ces informations pour répondre précisément à vos clients."
        action={
          <button onClick={() => setShowAddChunk(!showAddChunk)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        }
      >
        {showAddChunk && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie">
                <select value={newChunk.category}
                  onChange={e => setNewChunk(p => ({ ...p, category: e.target.value }))}
                  className="input">
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Titre">
                <input value={newChunk.title}
                  onChange={e => setNewChunk(p => ({ ...p, title: e.target.value }))}
                  className="input" placeholder="Ex: Menu déjeuner" autoFocus />
              </Field>
            </div>
            <Field label="Contenu">
              <textarea value={newChunk.content}
                onChange={e => setNewChunk(p => ({ ...p, content: e.target.value }))}
                className="input resize-none" rows={4}
                placeholder="Décrivez en détail cette information…" />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setShowAddChunk(false)}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent">
                Annuler
              </button>
              <button onClick={addChunk} disabled={addingChunk}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                {addingChunk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Ajouter
              </button>
            </div>
          </div>
        )}

        {knowledge.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune connaissance ajoutée.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez votre menu, vos horaires, vos politiques pour entraîner l'IA.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {knowledge.map(chunk => (
              <div key={chunk.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 hover:bg-accent/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-primary/10 text-primary rounded-md px-2 py-0.5 font-medium capitalize">
                      {CATEGORIES.find(c => c.value === chunk.category)?.label ?? chunk.category}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{chunk.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{chunk.content}</p>
                </div>
                <button onClick={() => deleteChunk(chunk.id)}
                  className="rounded-lg p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Team Settings ─────────────────────────────────────────────────────────────
function TeamSettings({
  members, restaurantId, currentUserId, currentUserRole
}: {
  members: any[];
  restaurantId: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    owner: { label: "Propriétaire", icon: Crown, color: "text-yellow-600" },
    manager: { label: "Manager", icon: Shield, color: "text-blue-600" },
    staff: { label: "Staff", icon: Users, color: "text-foreground" },
    readonly: { label: "Lecture seule", icon: BookOpen, color: "text-muted-foreground" },
  };

  return (
    <Card title="Équipe" description="Gérez les accès à votre espace RestoOS.">
      <div className="divide-y divide-border">
        {members.map(member => {
          const cfg = roleLabels[member.role] ?? roleLabels.staff;
          const isMe = member.user_id === currentUserId;
          const email = member.user?.email ?? "—";
          const name = member.user?.raw_user_meta_data?.full_name ?? email.split("@")[0];

          return (
            <div key={member.id} className="flex items-center justify-between py-3.5 px-1">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                  {name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    {isMe && <span className="text-xs text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">Vous</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
                <cfg.icon className="h-3.5 w-3.5" />
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>
      {currentUserRole === "owner" && (
        <button className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
          <Plus className="h-4 w-4" />
          Inviter un membre
        </button>
      )}
    </Card>
  );
}

// ─── Billing Settings ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "49€",
    period: "/mois",
    description: "Parfait pour démarrer",
    features: ["1 restaurant", "Réservations illimitées", "Inbox (3 canaux)", "Réponses IA (50/mois)", "Support email"],
    color: "border-border",
  },
  {
    id: "pro",
    name: "Pro",
    price: "99€",
    period: "/mois",
    description: "Pour les restaurants actifs",
    features: ["1 restaurant", "Tout Starter +", "Inbox (tous canaux)", "Réponses IA illimitées", "Analytics avancés", "Intégrations TheFork/Zenchef", "Support prioritaire"],
    color: "border-primary",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "249€",
    period: "/mois",
    description: "Groupes & multi-établissements",
    features: ["Jusqu'à 10 restaurants", "Tout Pro +", "Tableau de bord groupe", "API accès", "Account manager dédié", "SLA 99.9%"],
    color: "border-border",
  },
];

function BillingSettings({
  organization, restaurantId
}: {
  organization: Organization | null;
  restaurantId: string;
}) {
  const currentPlan = organization?.plan ?? "starter";
  const trialEnd = organization?.trial_ends_at;
  const isTrialing = organization?.subscription_status === null && trialEnd && new Date(trialEnd) > new Date();

  return (
    <div className="space-y-5">
      {/* Current status */}
      {isTrialing && trialEnd && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Période d'essai en cours</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Votre essai gratuit se termine le{" "}
              <span className="font-medium text-foreground">
                {new Date(trialEnd).toLocaleDateString("fr-FR")}
              </span>.
              Abonnez-vous pour ne pas perdre l'accès.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id}
              className={cn(
                "rounded-2xl border-2 p-5 relative",
                plan.highlighted ? "border-primary" : "border-border",
                isCurrent && "ring-2 ring-primary/20"
              )}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Populaire
                </div>
              )}
              <div className="mb-4">
                <h3 className="font-bold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-center text-sm font-medium text-primary">
                  Plan actuel ✓
                </div>
              ) : (
                <button
                  onClick={() => {
                    // Stripe checkout redirect
                    window.location.href = `/api/stripe/checkout?plan=${plan.id}&restaurant_id=${restaurantId}`;
                  }}
                  className={cn(
                    "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-accent"
                  )}
                >
                  Choisir {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manage billing */}
      {organization?.stripe_subscription_id && (
        <Card title="Facturation">
          <p className="text-sm text-muted-foreground mb-4">
            Gérez vos factures, méthodes de paiement et changements d'abonnement via le portail Stripe.
          </p>
          <a
            href={`/api/stripe/portal?restaurant_id=${restaurantId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Gérer mon abonnement
          </a>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Card({
  title, description, children, action
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label, description, checked, onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors mt-0.5",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <div className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "left-6" : "left-1"
        )} />
      </div>
    </label>
  );
}

// Global input style — injecter dans globals.css via className
const inputStyles = `
.input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--input));
  background-color: hsl(var(--background));
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}
.input:focus { outline: none; box-shadow: 0 0 0 2px hsl(var(--ring)); }
`;

"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search, Plus, UserCheck, UserX, Crown,
  Phone, Mail, Calendar, MoreVertical,
  Star, Tag, Loader2, X, Users, TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Contact } from "@/lib/types";

interface ContactsViewProps {
  initialContacts: Contact[];
  restaurantId: string;
}

type ContactFilter = "all" | "vip" | "blacklisted" | "regulars";

const TAGS_PRESET = ["Régulier", "Entreprise", "Famille", "Anniversaire", "Critique gastronomique", "Influenceur"];

export function ContactsView({ initialContacts, restaurantId }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filter === "vip" && !c.is_vip) return false;
      if (filter === "blacklisted" && !c.blacklisted) return false;
      if (filter === "regulars" && c.total_visits < 3) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.first_name.toLowerCase().includes(q) ||
          (c.last_name ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q)
        );
      }
      return true;
    });
  }, [contacts, filter, search]);

  async function toggleVIP(contact: Contact) {
    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .update({ is_vip: !contact.is_vip })
      .eq("id", contact.id);
    if (!error) {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, vip: !c.is_vip } : c));
      toast.success(contact.is_vip ? "VIP retiré" : "Marqué VIP ⭐");
    }
    setMenuOpen(null);
  }

  async function toggleBlacklist(contact: Contact) {
    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .update({ blacklisted: !contact.blacklisted })
      .eq("id", contact.id);
    if (!error) {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, blacklisted: !c.blacklisted } : c));
      toast.success(contact.blacklisted ? "Retiré de la liste noire" : "Mis en liste noire");
    }
    setMenuOpen(null);
  }

  const vipCount = contacts.filter(c => c.is_vip).length;
  const regularCount = contacts.filter(c => c.total_visits >= 3).length;
  const noShowRate = contacts.length
    ? Math.round((contacts.reduce((s, c) => s + c.total_no_shows, 0) / Math.max(contacts.reduce((s, c) => s + c.total_visits, 0), 1)) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {contacts.length} client{contacts.length !== 1 ? "s" : ""} · {vipCount} VIP · {regularCount} réguliers
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nouveau contact
        </button>
      </div>

      {/* Mini-stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total clients", value: contacts.length, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Clients VIP", value: vipCount, icon: Crown, color: "text-yellow-500 bg-yellow-500/10" },
          { label: "Taux no-show", value: `${noShowRate}%`, icon: TrendingDown, color: "text-red-500 bg-red-500/10" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un contact…"
            className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          {([
            { value: "all", label: "Tous" },
            { value: "vip", label: "⭐ VIP" },
            { value: "regulars", label: "Réguliers" },
            { value: "blacklisted", label: "Liste noire" },
          ] as const).map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">Aucun contact trouvé</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Ajouter un contact
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            {["Client", "Contact", "Visites", "Dernière visite", ""].map(h => (
              <div key={h} className="text-xs font-medium text-muted-foreground">{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map(contact => (
              <div
                key={contact.id}
                className={cn(
                  "grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-accent/30 transition-colors cursor-pointer",
                  contact.blacklisted && "opacity-50"
                )}
                onClick={() => setSelectedContact(contact)}
              >
                {/* Name + badges */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                    contact.is_vip
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-primary/10 text-primary"
                  )}>
                    {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {contact.first_name} {contact.last_name ?? ""}
                      </span>
                      {contact.is_vip && <Crown className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />}
                      {contact.blacklisted && <UserX className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                    </div>
                    {contact.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs bg-muted rounded-md px-1.5 py-0.5 text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="text-sm text-muted-foreground min-w-0">
                  {contact.phone ? (
                    <div className="flex items-center gap-1 truncate">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate text-xs">{contact.phone}</span>
                    </div>
                  ) : contact.email ? (
                    <div className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate text-xs">{contact.email}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Visits */}
                <div className="text-sm text-foreground font-medium tabular-nums">
                  {contact.total_visits}
                  {contact.total_no_shows > 0 && (
                    <span className="text-xs text-red-500 ml-1">({contact.total_no_shows} NS)</span>
                  )}
                </div>

                {/* Last visit */}
                <div className="text-xs text-muted-foreground">
                  {contact.last_visit_at
                    ? format(new Date(contact.last_visit_at), "d MMM yy", { locale: fr })
                    : "—"}
                </div>

                {/* Actions */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                    className="rounded-lg p-1.5 hover:bg-accent transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {menuOpen === contact.id && (
                    <div className="absolute right-0 top-8 w-44 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => toggleVIP(contact)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
                      >
                        <Crown className="h-3.5 w-3.5 text-yellow-500" />
                        {contact.is_vip ? "Retirer VIP" : "Marquer VIP"}
                      </button>
                      <button
                        onClick={() => toggleBlacklist(contact)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        {contact.blacklisted ? "Retirer liste noire" : "Liste noire"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={(updated) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedContact(updated);
          }}
        />
      )}

      {/* New contact modal */}
      {showNewModal && (
        <NewContactModal
          restaurantId={restaurantId}
          onClose={() => setShowNewModal(false)}
          onCreate={(c) => {
            setContacts(prev => [c, ...prev]);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function ContactDetailModal({
  contact,
  onClose,
  onUpdate,
}: {
  contact: Contact;
  onClose: () => void;
  onUpdate: (c: Contact) => void;
}) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveNotes() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .update({ notes })
      .eq("id", contact.id);
    if (!error) {
      onUpdate({ ...contact, notes });
      toast.success("Notes sauvegardées");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold",
              contact.is_vip ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"
            )}>
              {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {contact.first_name} {contact.last_name ?? ""}
              </h2>
              <div className="flex gap-2 mt-1 flex-wrap">
                {contact.is_vip && (
                  <span className="text-xs bg-yellow-500/10 text-yellow-600 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                )}
                {contact.blacklisted && (
                  <span className="text-xs bg-red-500/10 text-red-600 rounded-full px-2 py-0.5 font-medium">
                    Liste noire
                  </span>
                )}
                {contact.tags.map(t => (
                  <span key={t} className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Visites", value: contact.total_visits },
              { label: "No-shows", value: contact.total_no_shows },
              { label: "Dernière visite", value: contact.last_visit_at ? format(new Date(contact.last_visit_at), "d MMM", { locale: fr }) : "—" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors truncate">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes internes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Préférences, allergies, habitudes…"
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={saving || notes === contact.notes}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Contact Modal ─────────────────────────────────────────────────────────
function NewContactModal({
  restaurantId,
  onClose,
  onCreate,
}: {
  restaurantId: string;
  onClose: () => void;
  onCreate: (c: Contact) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
    tags: [] as string[],
    vip: false,
  });

  function update(field: string, value: string | boolean | string[]) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        restaurant_id: restaurantId,
        first_name: form.first_name.trim(),
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
        tags: form.tags,
        vip: form.is_vip,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Contact créé !");
      onCreate(data as Contact);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Nouveau contact</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Prénom *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={e => update("first_name", e.target.value)}
                placeholder="Jean"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => update("last_name", e.target.value)}
                placeholder="Dupont"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Téléphone</label>
            <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
              placeholder="jean@email.fr"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS_PRESET.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-xs font-medium transition-all border",
                    form.tags.includes(tag)
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:border-border/60"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* VIP toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => update("vip", !form.is_vip)}
              className={cn(
                "h-6 w-10 rounded-full transition-colors relative flex-shrink-0",
                form.is_vip ? "bg-yellow-500" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                form.is_vip ? "left-5" : "left-1"
              )} />
            </div>
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-yellow-500" /> Marquer comme VIP
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

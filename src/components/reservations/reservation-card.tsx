"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users, Phone, Mail, CheckCircle2, XCircle, UserX,
  ChevronDown, Utensils, AlertTriangle, Loader2, MessageSquare
} from "lucide-react";
import type { Reservation, ReservationStatus } from "@/lib/types";

const statusConfig: Record<ReservationStatus, { label: string; dot: string; badge: string }> = {
  pending:   { label: "En attente", dot: "bg-amber-400",    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  confirmed: { label: "Confirmée",  dot: "bg-emerald-400",  badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  seated:    { label: "Installée",  dot: "bg-blue-400",     badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  completed: { label: "Terminée",   dot: "bg-muted-foreground/40", badge: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Annulée",    dot: "bg-red-400",      badge: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
  no_show:   { label: "No-show",    dot: "bg-red-600",      badge: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
};

const statusActions: Record<ReservationStatus, { next: ReservationStatus; label: string; variant: "primary" | "warning" | "danger" }[]> = {
  pending:   [{ next: "confirmed", label: "Confirmer", variant: "primary" }, { next: "cancelled", label: "Annuler", variant: "danger" }],
  confirmed: [{ next: "seated", label: "Installer", variant: "primary" }, { next: "no_show", label: "No-show", variant: "warning" }, { next: "cancelled", label: "Annuler", variant: "danger" }],
  seated:    [{ next: "completed", label: "Terminer le service", variant: "primary" }],
  completed: [],
  cancelled: [],
  no_show:   [],
};

const sourceLabels: Record<string, string> = {
  manual: "Téléphone",
  thefork: "TheFork",
  zenchef: "Zenchef",
  google: "Google",
  widget: "Widget",
  phone: "Téléphone",
};

const occasionEmoji: Record<string, string> = {
  "Anniversaire": "🎂",
  "Mariage": "💍",
  "Romantique": "❤️",
  "Professionnel": "💼",
};

interface ReservationCardProps {
  reservation: Reservation;
  onUpdate: (updated: Reservation) => void;
}

export function ReservationCard({ reservation: r, onUpdate }: ReservationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const s = statusConfig[r.status];
  const actions = statusActions[r.status];
  const contact = r.contacts;
  const table = r.restaurant_tables;
  const isDimmed = r.status === "cancelled" || r.status === "completed";
  const time = new Date(r.reserved_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  async function updateStatus(newStatus: ReservationStatus) {
    setLoading(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    const updateData: Record<string, string | null> = { status: newStatus };
    if (newStatus === "confirmed") updateData.confirmed_at = now;
    if (newStatus === "seated")    updateData.seated_at = now;
    if (newStatus === "completed") updateData.completed_at = now;
    if (newStatus === "cancelled") updateData.cancelled_at = now;

    const { data, error } = await supabase
      .from("reservations")
      .update(updateData)
      .eq("id", r.id)
      .select("*, contacts(first_name, last_name, phone, email, is_vip), restaurant_tables(name, capacity)")
      .single();

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else if (data) {
      onUpdate(data as Reservation);
      toast.success(`✓ ${statusConfig[newStatus].label}`);
    }
    setLoading(false);
  }

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-sm",
      isDimmed && "opacity-50",
      expanded && "shadow-sm"
    )}>
      {/* Main row */}
      <button
        className="flex items-center gap-4 px-5 py-4 w-full text-left hover:bg-accent/40 transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot + Time */}
        <div className="flex items-center gap-2.5 flex-shrink-0 w-16">
          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", s.dot)} />
          <span className="text-sm font-bold tabular-nums text-foreground">{time}</span>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate text-sm">{r.guest_name}</span>
            {contact?.is_vip && (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0 border border-amber-500/20">
                VIP
              </span>
            )}
            {r.occasion && (
              <span className="text-sm flex-shrink-0">{occasionEmoji[r.occasion] ?? "🎉"}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {r.party_size}
            </span>
            {table?.name && (
              <span className="flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                {table.name}
              </span>
            )}
            {r.source !== "manual" && (
              <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-medium">
                {sourceLabels[r.source] ?? r.source}
              </span>
            )}
          </div>
        </div>

        {/* Right: status badge + allergies warning + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {r.allergies && (
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" aria-label="Allergies" />
          )}
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:inline-flex",
            s.badge
          )}>
            {s.label}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border/60 px-5 py-4 space-y-4 bg-muted/20 animate-fade-in">
          {/* Contact info */}
          {(r.guest_phone || r.guest_email) && (
            <div className="flex flex-wrap gap-3">
              {r.guest_phone && (
                <a href={`tel:${r.guest_phone}`}
                  className="inline-flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors bg-background rounded-xl px-3 py-2 border border-border hover:border-primary/30"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {r.guest_phone}
                </a>
              )}
              {r.guest_email && (
                <a href={`mailto:${r.guest_email}`}
                  className="inline-flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors bg-background rounded-xl px-3 py-2 border border-border hover:border-primary/30 max-w-[220px]"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{r.guest_email}</span>
                </a>
              )}
              <a href={`/dashboard/inbox`}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background rounded-xl px-3 py-2 border border-border"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </a>
            </div>
          )}

          {/* Extras: occasions, allergies, requests */}
          {(r.special_requests || r.allergies || r.occasion || r.internal_notes) && (
            <div className="rounded-xl bg-background border border-border p-3 space-y-2 text-xs">
              {r.occasion && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium w-20 flex-shrink-0">Occasion</span>
                  <span className="text-foreground">{occasionEmoji[r.occasion] ?? ""} {r.occasion}</span>
                </div>
              )}
              {r.allergies && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium w-20 flex-shrink-0 mt-0.5">Allergies</span>
                  <span className="text-orange-600 dark:text-orange-400 font-medium flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {r.allergies}
                  </span>
                </div>
              )}
              {r.special_requests && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium w-20 flex-shrink-0">Demandes</span>
                  <span className="text-foreground">{r.special_requests}</span>
                </div>
              )}
              {r.internal_notes && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium w-20 flex-shrink-0">Note interne</span>
                  <span className="text-muted-foreground italic">{r.internal_notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!loading && actions.map((a) => (
                <button
                  key={a.next}
                  onClick={(e) => { e.stopPropagation(); updateStatus(a.next); }}
                  disabled={loading}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-[0.97]",
                    a.variant === "primary"  && "bg-primary text-primary-foreground hover:bg-primary/90",
                    a.variant === "warning"  && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15 border border-orange-500/20",
                    a.variant === "danger"   && "bg-destructive/10 text-destructive hover:bg-destructive/15 border border-destructive/20"
                  )}
                >
                  {a.variant === "primary" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {a.variant === "danger"  && <XCircle className="h-3.5 w-3.5" />}
                  {a.variant === "warning" && <UserX className="h-3.5 w-3.5" />}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

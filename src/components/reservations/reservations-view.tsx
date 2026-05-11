"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Plus, Search, Calendar, List, ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import type { Reservation, RestaurantTable, ReservationStatus } from "@/lib/types";
import { NewReservationModal } from "@/components/reservations/new-reservation-modal";
import { ReservationCard } from "@/components/reservations/reservation-card";

interface ReservationsViewProps {
  initialReservations: Reservation[];
  tables: RestaurantTable[];
  restaurantId: string;
}

const statusTabs: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmées" },
  { value: "seated", label: "Installées" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
  { value: "no_show", label: "No-show" },
];

export function ReservationsView({
  initialReservations,
  tables,
  restaurantId,
}: ReservationsViewProps) {
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [showNewModal, setShowNewModal] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (!r.reserved_at.startsWith(dateStr)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.guest_name.toLowerCase().includes(q) ||
          (r.guest_phone && r.guest_phone.includes(q)) ||
          (r.guest_email && r.guest_email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [reservations, dateStr, statusFilter, search]);

  const totalCovers = filtered.reduce((sum, r) => sum + r.party_size, 0);

  function getDateLabel(date: Date) {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    return format(date, "EEE d MMM", { locale: fr });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Réservations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} réservation{filtered.length !== 1 ? "s" : ""} · {totalCovers} couvert{totalCovers !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle réservation
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setSelectedDate(d => addDays(d, -1))}
            className="rounded-lg p-1.5 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Quick dates */}
          <div className="flex gap-1">
            {[-1, 0, 1, 2, 3].map((offset) => {
              const d = addDays(new Date(), offset);
              const isSelected = format(d, "yyyy-MM-dd") === dateStr;
              return (
                <button
                  key={offset}
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {offset === 0 ? "Auj." : format(d, "d/MM")}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            className="rounded-lg p-1.5 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="text-sm font-medium text-foreground">
          {format(selectedDate, "EEEE d MMMM", { locale: fr })}
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 flex-1 max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={cn(
                "flex-shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                statusFilter === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">
            Aucune réservation {statusFilter !== "all" ? `(${statusTabs.find(t => t.value === statusFilter)?.label})` : ""}
          </p>
          <p className="text-sm text-muted-foreground mt-1">pour le {format(selectedDate, "d MMMM", { locale: fr })}</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Ajouter une réservation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onUpdate={(updated) =>
                setReservations((prev) =>
                  prev.map((x) => (x.id === updated.id ? updated : x))
                )
              }
            />
          ))}
        </div>
      )}

      {/* New Reservation Modal */}
      {showNewModal && (
        <NewReservationModal
          restaurantId={restaurantId}
          tables={tables}
          defaultDate={dateStr}
          onClose={() => setShowNewModal(false)}
          onCreate={(r) => {
            setReservations((prev) => [...prev, r]);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
  );
}

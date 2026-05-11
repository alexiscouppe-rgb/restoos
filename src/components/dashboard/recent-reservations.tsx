"use client";

import Link from "next/link";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Users, ArrowRight } from "lucide-react";
import type { ReservationStatus } from "@/lib/types";

interface ReservationRow {
  id: string;
  guest_name: string;
  party_size: number;
  reserved_at: string;
  status: ReservationStatus;
  contacts?: { first_name: string; last_name: string | null } | null;
}

const statusConfig: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  pending: { label: "En attente", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  confirmed: { label: "Confirmée", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  seated: { label: "Installée", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  no_show: { label: "No-show", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
};

export function RecentReservations({
  reservations,
  date,
}: {
  reservations: ReservationRow[];
  date: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">
            Réservations du jour
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(date + "T12:00:00"), "EEEE d MMMM", { locale: fr })}
          </p>
        </div>
        <Link
          href="/dashboard/reservations"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          Voir tout
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table */}
      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Aucune réservation aujourd&apos;hui
          </p>
          <Link
            href="/dashboard/reservations"
            className="mt-3 text-xs text-primary hover:underline"
          >
            Ajouter une réservation
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {reservations.map((r) => {
            const s = statusConfig[r.status];
            return (
              <Link
                key={r.id}
                href={`/dashboard/reservations/${r.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/50 transition-colors group"
              >
                {/* Heure */}
                <div className="w-12 text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
                  {new Date(r.reserved_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>

                {/* Nom */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.guest_name}
                  </p>
                </div>

                {/* Couverts */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  {r.party_size}
                </div>

                {/* Statut */}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0",
                    s.className
                  )}
                >
                  {s.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

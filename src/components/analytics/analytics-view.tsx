"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  TrendingUp, Calendar, Users, AlertTriangle,
  CheckCircle, BarChart3, PieChart
} from "lucide-react";

interface DailyPoint {
  date: string;
  reservations: number;
  covers: number;
}

interface AnalyticsViewProps {
  dailyData: DailyPoint[];
  totalReservations: number;
  totalCovers: number;
  confirmationRate: number;
  noShowRate: number;
  avgCoversPerDay: number;
  sourceData: { name: string; value: number }[];
  statusData: { name: string; value: number }[];
}

const sourceLabels: Record<string, string> = {
  manual: "Téléphone / Direct",
  thefork: "TheFork",
  zenchef: "Zenchef",
  google: "Google Reserve",
  widget: "Widget site web",
  phone: "Téléphone",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-400" },
  confirmed: { label: "Confirmées", color: "bg-emerald-400" },
  seated: { label: "Installées", color: "bg-blue-400" },
  completed: { label: "Terminées", color: "bg-emerald-600" },
  cancelled: { label: "Annulées", color: "bg-red-400" },
  no_show: { label: "No-show", color: "bg-red-600" },
};

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"];

export function AnalyticsView({
  dailyData,
  totalReservations,
  totalCovers,
  confirmationRate,
  noShowRate,
  avgCoversPerDay,
  sourceData,
  statusData,
}: AnalyticsViewProps) {
  const [metric, setMetric] = useState<"reservations" | "covers">("reservations");

  const maxValue = Math.max(...dailyData.map(d => d[metric]), 1);

  const totalSource = sourceData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">30 derniers jours</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Réservations",
            value: totalReservations,
            icon: Calendar,
            color: "text-blue-500 bg-blue-500/10",
            sub: "30 derniers jours",
          },
          {
            label: "Couverts",
            value: totalCovers,
            icon: Users,
            color: "text-emerald-500 bg-emerald-500/10",
            sub: `~${avgCoversPerDay}/jour en moy.`,
          },
          {
            label: "Taux confirmation",
            value: `${confirmationRate}%`,
            icon: CheckCircle,
            color: "text-emerald-500 bg-emerald-500/10",
            sub: confirmationRate >= 80 ? "Excellent 🎉" : confirmationRate >= 60 ? "Correct" : "À améliorer",
          },
          {
            label: "Taux no-show",
            value: `${noShowRate}%`,
            icon: AlertTriangle,
            color: noShowRate > 10 ? "text-red-500 bg-red-500/10" : "text-orange-500 bg-orange-500/10",
            sub: noShowRate > 10 ? "Élevé ⚠️" : noShowRate > 5 ? "Modéré" : "Faible ✓",
          },
        ].map(kpi => (
          <div key={kpi.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main chart + donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-foreground">Activité quotidienne</h2>
              <p className="text-xs text-muted-foreground mt-0.5">30 derniers jours</p>
            </div>
            <div className="flex gap-1.5 p-1 rounded-xl border border-border bg-muted/30">
              {(["reservations", "covers"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    metric === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  )}
                >
                  {m === "reservations" ? "Réservations" : "Couverts"}
                </button>
              ))}
            </div>
          </div>

          {/* Bar chart SVG */}
          <div className="flex items-end gap-1 h-40">
            {dailyData.map((d, i) => {
              const height = maxValue > 0 ? (d[metric] / maxValue) * 100 : 0;
              const isToday = d.date === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                    <div className="rounded-lg bg-foreground text-background px-2 py-1 text-xs font-medium whitespace-nowrap">
                      {format(parseISO(d.date), "d MMM", { locale: fr })} — {d[metric]} {metric === "reservations" ? "rés." : "couverts"}
                    </div>
                    <div className="w-2 h-1 bg-foreground" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                  </div>

                  {/* Bar */}
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all",
                      isToday ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"
                    )}
                    style={{ height: `${Math.max(height, d[metric] > 0 ? 4 : 0)}%` }}
                  />

                  {/* Label (show every 5) */}
                  {i % 5 === 0 && (
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {format(parseISO(d.date), "d/M")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Source breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Sources</h2>
          <p className="text-xs text-muted-foreground mb-5">Origine des réservations</p>

          {sourceData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <PieChart className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Pas encore de données</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sourceData
                .sort((a, b) => b.value - a.value)
                .map((s, i) => {
                  const pct = totalSource > 0 ? Math.round((s.value / totalSource) * 100) : 0;
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground font-medium">
                          {sourceLabels[s.name] ?? s.name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.value} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground mb-5">Répartition par statut</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(statusLabels).map(([key, cfg]) => {
            const found = statusData.find(s => s.name === key);
            const count = found?.value ?? 0;
            const pct = totalReservations > 0 ? Math.round((count / totalReservations) * 100) : 0;
            return (
              <div key={key} className="rounded-xl border border-border bg-background p-4 text-center">
                <div className={cn("h-2 w-8 rounded-full mx-auto mb-3", cfg.color)} />
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight card */}
      {noShowRate > 10 && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Taux de no-show élevé ({noShowRate}%)</p>
            <p className="text-sm text-muted-foreground mt-1">
              Considérez l&apos;envoi automatique de rappels SMS/WhatsApp 24h avant chaque réservation.
              RestoOS peut gérer ça automatiquement avec l&apos;IA.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

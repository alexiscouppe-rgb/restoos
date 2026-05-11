"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import type { Reservation, RestaurantTable } from "@/lib/types";

interface NewReservationModalProps {
  restaurantId: string;
  tables: RestaurantTable[];
  defaultDate: string;
  onClose: () => void;
  onCreate: (reservation: Reservation) => void;
}

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 11;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
}).filter((t) => {
  const h = parseInt(t.split(":")[0]);
  return (h >= 11 && h <= 15) || (h >= 18 && h <= 23);
});

export function NewReservationModal({
  restaurantId,
  tables,
  defaultDate,
  onClose,
  onCreate,
}: NewReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    party_size: "2",
    date: defaultDate,
    time: "19:30",
    table_id: "",
    special_requests: "",
    allergies: "",
    occasion: "",
    status: "confirmed" as "pending" | "confirmed",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guest_name.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        guest_name: form.guest_name.trim(),
        guest_phone: form.guest_phone || null,
        guest_email: form.guest_email || null,
        party_size: parseInt(form.party_size),
        reserved_at: `${form.date}T${form.time}:00`,
        duration_minutes: 90,
        table_id: form.table_id || null,
        status: form.status,
        source: "manual",
        special_requests: form.special_requests || null,
        allergies: form.allergies || null,
        occasion: form.occasion || null,
        confirmed_at: form.status === "confirmed" ? new Date().toISOString() : null,
      })
      .select("*, contacts(first_name, last_name, phone, email, vip), restaurant_tables(name, capacity)")
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
      setLoading(false);
      return;
    }

    toast.success("Réservation créée !");
    onCreate(data as Reservation);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">Nouvelle réservation</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nom du client *</label>
            <input
              type="text"
              required
              value={form.guest_name}
              onChange={(e) => update("guest_name", e.target.value)}
              placeholder="Jean Dupont"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={form.guest_phone}
                onChange={(e) => update("guest_phone", e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.guest_email}
                onChange={(e) => update("guest_email", e.target.value)}
                placeholder="client@email.fr"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Date + Time + Covers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Heure</label>
              <select
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Couverts</label>
              <select
                value={form.party_size}
                onChange={(e) => update("party_size", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {tables.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Table (optionnel)</label>
              <select
                value={form.table_id}
                onChange={(e) => update("table_id", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Sans assignation —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.capacity} pers.)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Occasion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Occasion</label>
              <select
                value={form.occasion}
                onChange={(e) => update("occasion", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Aucune</option>
                <option value="Anniversaire">🎂 Anniversaire</option>
                <option value="Mariage">💍 Mariage</option>
                <option value="Romantique">❤️ Romantique</option>
                <option value="Professionnel">💼 Professionnel</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Statut initial</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value as "pending" | "confirmed")}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="confirmed">Confirmée</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Allergies / régimes</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => update("allergies", e.target.value)}
              placeholder="Ex: gluten, lactose, végétarien…"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Demandes spéciales</label>
            <textarea
              value={form.special_requests}
              onChange={(e) => update("special_requests", e.target.value)}
              placeholder="Table en terrasse, chaise bébé, gâteau surprise…"
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Création…" : "Créer la réservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

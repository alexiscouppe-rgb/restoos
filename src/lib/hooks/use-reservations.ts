"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Reservation } from "@/lib/types";

interface UseReservationsOptions {
  restaurantId: string;
  date?: string;
  realtime?: boolean;
}

export function useReservations({
  restaurantId,
  date,
  realtime = false,
}: UseReservationsOptions) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("reservations")
      .select("*, contacts(first_name, last_name, phone, email, vip), restaurant_tables(name)")
      .eq("restaurant_id", restaurantId)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (date) query = query.eq("date", date);

    const { data, error: err } = await query.limit(200);
    if (err) setError(err.message);
    else setReservations(data as Reservation[]);
    setLoading(false);
  }, [restaurantId, date]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime updates
  useEffect(() => {
    if (!realtime) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`reservations-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, realtime, fetch]);

  return { reservations, loading, error, refetch: fetch };
}

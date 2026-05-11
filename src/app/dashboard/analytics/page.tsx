import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const restaurantId = membership.restaurant_id;
  const today = new Date();
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  // Reservations des 30 derniers jours
  const { data: reservations } = await supabase
    .from("reservations")
    .select("reserved_at, party_size, status, source, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("reserved_at", `${thirtyDaysAgo}T00:00:00`)
    .lte("reserved_at", `${todayStr}T23:59:59`)
    .order("reserved_at");

  // Distribution par canal source
  const sourceMap: Record<string, number> = {};
  const statusMap: Record<string, number> = {};
  const dayMap: Record<string, { reservations: number; covers: number }> = {};

  for (const r of reservations ?? []) {
    const day = r.reserved_at.slice(0, 10); // "YYYY-MM-DD"
    // Par source
    sourceMap[r.source] = (sourceMap[r.source] ?? 0) + 1;
    // Par statut
    statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
    // Par jour
    if (!dayMap[day]) dayMap[day] = { reservations: 0, covers: 0 };
    dayMap[day].reservations++;
    dayMap[day].covers += r.party_size;
  }

  // Remplir les jours manquants
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(today, 29 - i), "yyyy-MM-dd");
    return {
      date: d,
      reservations: dayMap[d]?.reservations ?? 0,
      covers: dayMap[d]?.covers ?? 0,
    };
  });

  const totalReservations = reservations?.length ?? 0;
  const totalCovers = reservations?.reduce((s, r) => s + r.party_size, 0) ?? 0;
  const confirmedOrCompleted = reservations?.filter(r => ["confirmed", "seated", "completed"].includes(r.status)).length ?? 0;
  const noShows = reservations?.filter(r => r.status === "no_show").length ?? 0;
  const confirmationRate = totalReservations > 0 ? Math.round((confirmedOrCompleted / totalReservations) * 100) : 0;
  const noShowRate = totalReservations > 0 ? Math.round((noShows / totalReservations) * 100) : 0;
  const avgCoversPerDay = totalReservations > 0 ? Math.round(totalCovers / 30) : 0;

  return (
    <AnalyticsView
      dailyData={dailyData}
      totalReservations={totalReservations}
      totalCovers={totalCovers}
      confirmationRate={confirmationRate}
      noShowRate={noShowRate}
      avgCoversPerDay={avgCoversPerDay}
      sourceData={Object.entries(sourceMap).map(([name, value]) => ({ name, value }))}
      statusData={Object.entries(statusMap).map(([name, value]) => ({ name, value }))}
    />
  );
}

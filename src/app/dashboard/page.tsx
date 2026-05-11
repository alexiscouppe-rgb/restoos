import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentReservations } from "@/components/dashboard/recent-reservations";
import { PendingMessages } from "@/components/dashboard/pending-messages";
import { Calendar, MessageSquare, Star, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Récupérer le restaurant actif
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, restaurants(name)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const restaurantId = membership.restaurant_id;
  const today = new Date().toISOString().split("T")[0];

  // Stats du jour
  const [{ count: todayResa }, { count: pendingMessages }, { count: pendingReviews }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .gte("reserved_at", `${today}T00:00:00`)
        .lte("reserved_at", `${today}T23:59:59`)
        .in("status", ["confirmed", "pending", "seated"]),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "open"),
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .is("reply", null),
    ]);

  // Réservations du jour
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, contacts(first_name, last_name)")
    .eq("restaurant_id", restaurantId)
    .gte("reserved_at", `${today}T00:00:00`)
    .lte("reserved_at", `${today}T23:59:59`)
    .order("reserved_at", { ascending: true })
    .limit(8);

  // Messages récents
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, contacts(first_name, last_name)")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("last_message_at", { ascending: false })
    .limit(5);

  const restaurant = membership.restaurants as unknown as { name: string };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            <span className="mx-2 text-border">·</span>
            <span className="font-medium text-foreground">{restaurant.name}</span>
          </p>
        </div>
        {(todayResa ?? 0) > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Service en cours
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard
          title="Réservations aujourd'hui"
          value={todayResa ?? 0}
          icon={Calendar}
          color="blue"
          subtitle={(todayResa ?? 0) === 0 ? "Aucune réservation" : undefined}
        />
        <StatCard
          title="Messages ouverts"
          value={pendingMessages ?? 0}
          icon={MessageSquare}
          color="orange"
          urgent={(pendingMessages ?? 0) > 5}
          subtitle={(pendingMessages ?? 0) > 5 ? "Action requise" : undefined}
        />
        <StatCard
          title="Avis sans réponse"
          value={pendingReviews ?? 0}
          icon={Star}
          color="yellow"
          urgent={(pendingReviews ?? 0) > 3}
        />
        <StatCard
          title="Taux d'occupation"
          value="78%"
          icon={TrendingUp}
          color="green"
          trend="+5% vs mois dernier"
          trendUp={true}
        />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RecentReservations reservations={reservations ?? []} date={today} />
        </div>
        <div className="lg:col-span-2">
          <PendingMessages conversations={conversations ?? []} />
        </div>
      </div>
    </div>
  );
}

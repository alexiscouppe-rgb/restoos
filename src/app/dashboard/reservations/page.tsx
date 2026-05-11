import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReservationsView } from "@/components/reservations/reservations-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

export default async function ReservationsPage() {
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
  const today = new Date().toISOString().split("T")[0];

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, contacts(first_name, last_name, phone, email, is_vip), restaurant_tables(name, capacity)")
    .eq("restaurant_id", restaurantId)
    .gte("reserved_at", `${today}T00:00:00`)
    .order("reserved_at", { ascending: true })
    .limit(100);

  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name");

  return (
    <ReservationsView
      initialReservations={reservations ?? []}
      tables={tables ?? []}
      restaurantId={restaurantId}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewsView } from "@/components/reviews/reviews-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avis" };

export default async function ReviewsPage() {
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("restaurant_id", membership.restaurant_id)
    .order("published_at", { ascending: false })
    .limit(50);

  return <ReviewsView initialReviews={reviews ?? []} restaurantId={membership.restaurant_id} />;
}

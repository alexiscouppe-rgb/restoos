import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Déjà un restaurant → dashboard
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .single();

  if (membership) redirect("/dashboard");

  return <OnboardingWizard userId={user.id} userEmail={user.email ?? ""} userName={user.user_metadata?.full_name ?? ""} />;
}

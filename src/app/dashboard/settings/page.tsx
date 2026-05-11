import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, role, restaurants(*)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const restaurantId = membership.restaurant_id;

  const [
    { data: tables },
    { data: members },
    { data: knowledge },
    { data: org },
    { data: integrationsRaw },
  ] = await Promise.all([
    supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurantId).order("name"),
    supabase.from("restaurant_members").select("*, user:user_id(email, raw_user_meta_data)").eq("restaurant_id", restaurantId).not("accepted_at", "is", null),
    supabase.from("ai_knowledge_chunks").select("*").eq("restaurant_id", restaurantId).eq("is_active", true).order("category"),
    supabase.from("organizations").select("*").eq("id", (membership.restaurants as any).organization_id).single(),
    supabase.from("integrations").select("*").eq("restaurant_id", restaurantId),
  ]);

  // Transformer en map platform → integration
  const integrations: Record<string, any> = {};
  for (const integration of integrationsRaw ?? []) {
    integrations[integration.platform] = integration;
  }

  return (
    <SettingsView
      restaurant={membership.restaurants as any}
      tables={tables ?? []}
      members={members ?? []}
      knowledge={knowledge ?? []}
      organization={org}
      currentUserId={user.id}
      currentUserRole={membership.role}
      integrations={integrations}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
    />
  );
}

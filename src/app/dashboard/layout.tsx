import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Charger le restaurant actif de l'utilisateur
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, role, restaurants(id, name, logo_url, plan:organizations(plan))")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  // Pas encore de restaurant → onboarding
  if (!membership) {
    redirect("/onboarding");
  }

  const restaurant = membership.restaurants as unknown as {
    id: string;
    name: string;
    logo_url: string | null;
    plan: { plan: string } | null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          logoUrl: restaurant.logo_url,
        }}
        userRole={membership.role}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

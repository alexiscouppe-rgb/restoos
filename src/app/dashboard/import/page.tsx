import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImportCenter } from "@/components/import/import-center";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importer" };

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .limit(1)
    .single();

  if (!member) redirect("/onboarding");

  return <ImportCenter restaurantId={member.restaurant_id} />;
}

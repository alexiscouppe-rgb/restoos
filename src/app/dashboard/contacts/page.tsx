import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsView } from "@/components/contacts/contacts-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("restaurant_id", membership.restaurant_id)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .limit(200);

  return (
    <ContactsView
      initialContacts={contacts ?? []}
      restaurantId={membership.restaurant_id}
    />
  );
}

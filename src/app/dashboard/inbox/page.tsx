import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InboxView } from "@/components/inbox/inbox-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
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

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, contacts(first_name, last_name, phone, email, vip)")
    .eq("restaurant_id", membership.restaurant_id)
    .neq("status", "archived")
    .order("last_message_at", { ascending: false })
    .limit(50);

  return (
    <InboxView
      initialConversations={conversations ?? []}
      restaurantId={membership.restaurant_id}
      currentUserId={user.id}
    />
  );
}

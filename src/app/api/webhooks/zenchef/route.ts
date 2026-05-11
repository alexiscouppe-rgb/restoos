import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const zenchefRestaurantId = String(body.restaurant_id ?? body.restaurantId ?? "");
  if (!zenchefRestaurantId) return NextResponse.json({ ok: true });

  // Trouver le restaurant via le zenchef_restaurant_id dans settings
  const { data: integrations } = await admin
    .from("integrations")
    .select("restaurant_id, settings")
    .eq("platform", "zenchef")
    .eq("is_active", true);

  const integration = integrations?.find(
    (i) => String(i.settings?.zenchef_restaurant_id) === zenchefRestaurantId
  );

  if (!integration) return NextResponse.json({ ok: true });
  const restaurantId = integration.restaurant_id;

  await admin.from("webhook_events").insert({
    restaurant_id: restaurantId,
    source: "zenchef",
    event_type: body.event ?? body.type ?? "booking.updated",
    payload: body,
  });

  const booking = body.booking ?? body;
  if (!booking?.id) return NextResponse.json({ ok: true });

  const customer = booking.customer ?? {};
  const reservedAt = new Date(`${booking.date}T${booking.time ?? "12:00"}:00`);
  const statusMap: Record<string, string> = { confirmed: "confirmed", pending: "pending", cancelled: "cancelled", noshow: "no_show", no_show: "no_show", seated: "seated", finished: "completed", completed: "completed" };
  const status = statusMap[String(booking.status ?? "confirmed").toLowerCase()] ?? "confirmed";

  let contactId: string | null = null;
  if (customer.email) {
    const { data: existing } = await admin.from("contacts").select("id, visit_count").eq("restaurant_id", restaurantId).eq("email", customer.email).maybeSingle();
    if (existing) {
      contactId = existing.id;
      if (status === "completed") await admin.from("contacts").update({ visit_count: (existing.visit_count ?? 0) + 1 }).eq("id", contactId);
    } else {
      const { data: nc } = await admin.from("contacts").insert({ restaurant_id: restaurantId, first_name: customer.firstname ?? null, last_name: customer.lastname ?? null, email: customer.email ?? null, phone: customer.phone ?? null, visit_count: 0 }).select("id").single();
      contactId = nc?.id ?? null;
    }
  }

  await admin.from("reservations").upsert({
    restaurant_id: restaurantId,
    contact_id: contactId,
    guest_name: [customer.firstname, customer.lastname].filter(Boolean).join(" ") || "Client",
    guest_email: customer.email ?? null,
    guest_phone: customer.phone ?? null,
    party_size: booking.covers ?? 2,
    reserved_at: reservedAt.toISOString(),
    status,
    notes: booking.comment ?? null,
    source: "zenchef",
    external_id: String(booking.id),
  }, { onConflict: "restaurant_id,external_id" });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: "Zenchef webhook active" });
}

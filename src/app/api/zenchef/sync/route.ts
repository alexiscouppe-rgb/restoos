import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

interface ZenchefBooking {
  id: number;
  date: string;
  time: string;
  covers: number;
  status: string;
  customer?: { firstname?: string; lastname?: string; email?: string; phone?: string };
  comment?: string;
}

interface ZenchefCustomer {
  id: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  vip?: boolean;
  comment?: string;
  tags?: string[];
  totalBookings?: number;
}

function mapStatus(s: string): string {
  return ({ confirmed:"confirmed", pending:"pending", cancelled:"cancelled", noshow:"no_show", no_show:"no_show", seated:"seated", finished:"completed", completed:"completed" } as Record<string,string>)[s.toLowerCase()] ?? "confirmed";
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { restaurantId, mode = "all" } = await request.json();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: integration } = await admin
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("platform", "zenchef")
    .single();

  if (!integration) return NextResponse.json({ error: "Zenchef non connecté" }, { status: 400 });

  const token = integration.credentials?.api_token;
  const zenchefId = integration.settings?.zenchef_restaurant_id;
  const baseUrl = integration.settings?.base_url ?? "https://api.zenchef.com/v1/partners";

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Api-Token": token,
  };

  const results = { reservations: { imported: 0, skipped: 0 }, contacts: { imported: 0, skipped: 0 } };

  if (mode === "all" || mode === "reservations") {
    let page = 1, hasMore = true;
    while (hasMore) {
      const res = await fetch(`${baseUrl}/bookings?restaurant_id=${zenchefId}&limit=100&page=${page}`, { headers });
      if (!res.ok) break;
      const data = await res.json();
      const bookings: ZenchefBooking[] = data.data ?? data.bookings ?? data ?? [];
      if (!bookings.length) { hasMore = false; break; }

      for (const booking of bookings) {
        try {
          let contactId: string | null = null;
          if (booking.customer?.email || booking.customer?.phone) {
            const conditions = [booking.customer.email && `email.eq.${booking.customer.email}`, booking.customer.phone && `phone.eq.${booking.customer.phone}`].filter(Boolean).join(",");
            const { data: existing } = await admin.from("contacts").select("id").eq("restaurant_id", restaurantId).or(conditions).maybeSingle();
            if (existing) { contactId = existing.id; }
            else {
              const { data: nc } = await admin.from("contacts").insert({ restaurant_id: restaurantId, first_name: booking.customer.firstname ?? null, last_name: booking.customer.lastname ?? null, email: booking.customer.email ?? null, phone: booking.customer.phone ?? null, visit_count: 0 }).select("id").single();
              contactId = nc?.id ?? null;
            }
          }
          const reservedAt = new Date(`${booking.date}T${booking.time ?? "12:00"}:00`);
          const { error } = await admin.from("reservations").upsert({ restaurant_id: restaurantId, contact_id: contactId, guest_name: [booking.customer?.firstname, booking.customer?.lastname].filter(Boolean).join(" ") || "Client", guest_email: booking.customer?.email ?? null, guest_phone: booking.customer?.phone ?? null, party_size: booking.covers ?? 2, reserved_at: reservedAt.toISOString(), status: mapStatus(booking.status ?? "confirmed"), notes: booking.comment ?? null, source: "zenchef", external_id: String(booking.id) }, { onConflict: "restaurant_id,external_id" });
          if (error) results.reservations.skipped++; else results.reservations.imported++;
        } catch { results.reservations.skipped++; }
      }
      if (bookings.length < 100) hasMore = false; else page++;
    }
  }

  if (mode === "all" || mode === "contacts") {
    let page = 1, hasMore = true;
    while (hasMore) {
      const res = await fetch(`${baseUrl}/customers?restaurant_id=${zenchefId}&limit=100&page=${page}`, { headers });
      if (!res.ok) break;
      const data = await res.json();
      const customers: ZenchefCustomer[] = data.data ?? data.customers ?? data ?? [];
      if (!customers.length) { hasMore = false; break; }

      for (const c of customers) {
        try {
          const { error } = await admin.from("contacts").upsert({ restaurant_id: restaurantId, first_name: c.firstname ?? null, last_name: c.lastname ?? null, email: c.email ?? null, phone: c.phone ?? null, is_vip: c.vip ?? false, tags: c.tags ?? [], notes: c.comment ?? null, visit_count: c.totalBookings ?? 0 }, { onConflict: "restaurant_id,email" });
          if (error) results.contacts.skipped++; else results.contacts.imported++;
        } catch { results.contacts.skipped++; }
      }
      if (customers.length < 100) hasMore = false; else page++;
    }
  }

  await admin.from("integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ success: true, results });
}

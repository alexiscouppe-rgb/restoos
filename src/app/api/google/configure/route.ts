import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { restaurantId, accountName, locationId, locationTitle } = await request.json();

  if (!restaurantId || !accountName || !locationId) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin
    .from("integrations")
    .update({
      settings: {
        account_name: accountName,
        location_id: locationId,
        location_title: locationTitle ?? "Établissement",
        auto_reply: false,
      },
    })
    .eq("restaurant_id", restaurantId)
    .eq("platform", "google");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

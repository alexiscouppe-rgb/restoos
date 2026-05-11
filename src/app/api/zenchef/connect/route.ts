import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

  const { restaurantId, apiToken, zenchefRestaurantId } = await request.json();
  if (!restaurantId || !apiToken || !zenchefRestaurantId) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  await admin.from("integrations").upsert({
    restaurant_id: restaurantId,
    platform: "zenchef",
    external_id: zenchefRestaurantId,
    is_active: true,
    credentials: {
      api_token: apiToken,
    },
    settings: {
      zenchef_restaurant_id: zenchefRestaurantId,
      base_url: "https://api.zenchef.com/v1/partners",
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/zenchef`,
    },
  }, { onConflict: "restaurant_id,platform" });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function PATCH(request: NextRequest) {
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

  const { restaurantId, provider, config } = await request.json();
  if (!restaurantId || !provider) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Vérifier accès
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .not("accepted_at", "is", null)
    .single();

  if (!membership) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  // Charger l'intégration existante pour merger les settings
  const { data: existing } = await admin
    .from("integrations")
    .select("settings")
    .eq("restaurant_id", restaurantId)
    .eq("platform", provider)
    .single();

  const mergedSettings = { ...(existing?.settings ?? {}), ...config };

  const { error } = await admin
    .from("integrations")
    .update({ settings: mergedSettings })
    .eq("restaurant_id", restaurantId)
    .eq("platform", provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

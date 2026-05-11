import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // 1. Vérifier l'authentification via session server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 2. Utiliser le client admin (service role) pour les insertions — bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await request.json();
  const { restaurantName, cuisineType, address, city, phone, email, timezone } = body;

  if (!restaurantName?.trim()) {
    return NextResponse.json({ error: "Nom du restaurant requis" }, { status: 400 });
  }

  try {
    // 3. Créer l'organization
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: restaurantName,
        plan: "starter",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (orgError) throw orgError;

    // 4. Créer le restaurant
    const slug = slugify(restaurantName) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: restaurant, error: restoError } = await adminClient
      .from("restaurants")
      .insert({
        organization_id: org.id,
        name: restaurantName,
        slug,
        cuisine_type: cuisineType || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
        timezone: timezone || "Europe/Paris",
      })
      .select("id")
      .single();

    if (restoError) throw restoError;

    // 5. Ajouter l'utilisateur comme owner
    const { error: memberError } = await adminClient
      .from("restaurant_members")
      .insert({
        restaurant_id: restaurant.id,
        user_id: user.id,
        role: "owner",
        accepted_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    return NextResponse.json({ success: true, restaurantId: restaurant.id });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[onboarding]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

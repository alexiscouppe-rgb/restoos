import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId manquant" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: integration } = await admin
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("platform", "google")
    .single();

  if (!integration) return NextResponse.json({ error: "Google non connecté" }, { status: 400 });

  let accessToken = integration.credentials?.access_token;
  const expiresAt = new Date(integration.credentials?.expires_at ?? 0);

  // Rafraîchir le token si expiré
  if (expiresAt <= new Date()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: integration.credentials?.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (!data.access_token) return NextResponse.json({ error: "Token expiré — reconnectez Google" }, { status: 401 });
    accessToken = data.access_token;
    await admin.from("integrations").update({
      credentials: { ...integration.credentials, access_token: accessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }
    }).eq("id", integration.id);
  }

  // 1. Lister les comptes
  const accountsRes = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const accountsData = await accountsRes.json();

  if (!accountsRes.ok) {
    return NextResponse.json({ error: accountsData.error?.message ?? "Erreur API Google Accounts" }, { status: 500 });
  }

  const accounts = accountsData.accounts ?? [];
  const locations: Array<{ accountName: string; locationId: string; locationName: string; title: string }> = [];

  // 2. Pour chaque compte, lister les établissements
  for (const account of accounts) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!locRes.ok) continue;
    const locData = await locRes.json();
    for (const loc of locData.locations ?? []) {
      const locationId = loc.name.split("/").pop();
      locations.push({
        accountName: account.name,
        locationId,
        locationName: loc.name,
        title: loc.title ?? "Établissement",
      });
    }
  }

  return NextResponse.json({ locations });
}

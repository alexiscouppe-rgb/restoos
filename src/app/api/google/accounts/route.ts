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

  const authHeader = { Authorization: `Bearer ${accessToken}` };
  const locations: Array<{ accountName: string; locationId: string; locationName: string; title: string }> = [];

  // Essayer les 2 APIs Google My Business (nouvelle + legacy v4)
  const accountsEndpoints = [
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    "https://mybusiness.googleapis.com/v4/accounts",
  ];

  let accounts: Array<{ name: string }> = [];
  let usedLegacy = false;

  for (const endpoint of accountsEndpoints) {
    try {
      const res = await fetch(endpoint, { headers: authHeader });
      if (!res.ok) { console.warn(`Google accounts endpoint ${endpoint} failed: ${res.status}`); continue; }
      const data = await res.json();
      accounts = data.accounts ?? [];
      usedLegacy = endpoint.includes("mybusiness.googleapis.com/v4");
      if (accounts.length > 0) break;
    } catch { continue; }
  }

  if (accounts.length === 0) {
    return NextResponse.json({ error: "Impossible de récupérer vos comptes Google. Vérifiez que les APIs Google My Business sont activées dans Google Cloud Console, ou reconnectez votre compte Google." }, { status: 500 });
  }

  // Pour chaque compte, lister les établissements
  for (const account of accounts) {
    // Essayer nouvelle API puis legacy
    const locEndpoints = usedLegacy
      ? [`https://mybusiness.googleapis.com/v4/${account.name}/locations`]
      : [
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
          `https://mybusiness.googleapis.com/v4/${account.name}/locations`,
        ];

    for (const locEndpoint of locEndpoints) {
      try {
        const locRes = await fetch(locEndpoint, { headers: authHeader });
        if (!locRes.ok) continue;
        const locData = await locRes.json();
        const locs = locData.locations ?? locData.basicMetrics ?? [];
        for (const loc of locs) {
          const locationId = (loc.name as string)?.split("/").pop() ?? "";
          if (!locationId) continue;
          locations.push({
            accountName: account.name,
            locationId,
            locationName: loc.name,
            title: loc.title ?? loc.locationName ?? "Établissement",
          });
        }
        if (locations.length > 0) break;
      } catch { continue; }
    }
  }

  return NextResponse.json({ locations });
}

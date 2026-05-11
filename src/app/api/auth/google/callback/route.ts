import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=google_denied`);
  }

  let restaurantId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    restaurantId = decoded.restaurantId;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=invalid_state`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=token_failed`);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  let accountName: string | null = null;
  let locationId: string | null = null;
  let locationTitle: string | null = null;

  try {
    const authHeader = { Authorization: `Bearer ${tokens.access_token}` };
    // Essayer nouvelle API puis legacy v4
    for (const endpoint of [
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      "https://mybusiness.googleapis.com/v4/accounts",
    ]) {
      try {
        const res = await fetch(endpoint, { headers: authHeader });
        if (!res.ok) continue;
        const data = await res.json();
        const account = data.accounts?.[0];
        if (!account) continue;
        accountName = account.name;
        // Lister les établissements
        for (const locEndpoint of [
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
          `https://mybusiness.googleapis.com/v4/${account.name}/locations`,
        ]) {
          try {
            const locRes = await fetch(locEndpoint, { headers: authHeader });
            if (!locRes.ok) continue;
            const locData = await locRes.json();
            const location = (locData.locations ?? [])[0];
            if (location) {
              locationId = location.name?.split("/").pop() ?? null;
              locationTitle = location.title ?? location.locationName ?? null;
              break;
            }
          } catch { continue; }
        }
        break;
      } catch { continue; }
    }
  } catch { /* non bloquant */ }

  const { error: upsertError } = await admin.from("integrations").upsert({
    restaurant_id: restaurantId,
    platform: "google",
    external_id: accountName ?? "google_business",
    is_active: true,
    credentials: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
    },
    settings: {
      account_name: accountName,
      location_id: locationId,
      location_title: locationTitle ?? "Google Business Profile",
      auto_reply: false,
    },
  }, { onConflict: "restaurant_id,platform" });

  if (upsertError) {
    console.error("Google integration upsert error:", upsertError);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=db_error&msg=${encodeURIComponent(upsertError.message)}`);
  }

  if (!accountName) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&warning=no_business_account`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&success=google`);
}

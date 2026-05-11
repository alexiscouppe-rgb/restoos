import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId manquant" });

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

  if (!integration) return NextResponse.json({ error: "Intégration non trouvée" });

  const accessToken = integration.credentials?.access_token;

  // Test accounts
  const accountsRes = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const accountsData = await accountsRes.json();

  return NextResponse.json({
    integration_settings: integration.settings,
    accounts_status: accountsRes.status,
    accounts_data: accountsData,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function refreshToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  return data.access_token ?? null;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { restaurantId } = await request.json();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: integration } = await admin.from("integrations").select("*").eq("restaurant_id", restaurantId).eq("platform", "google").single();
  if (!integration) return NextResponse.json({ error: "Google non connecté" }, { status: 400 });

  let accessToken = integration.credentials?.access_token;
  const expiresAt = new Date(integration.credentials?.expires_at ?? 0);

  if (expiresAt <= new Date()) {
    accessToken = await refreshToken(integration.credentials?.refresh_token);
    if (!accessToken) return NextResponse.json({ error: "Token expiré, reconnectez Google" }, { status: 401 });
    await admin.from("integrations").update({
      credentials: { ...integration.credentials, access_token: accessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }
    }).eq("id", integration.id);
  }

  const { account_name, location_id } = integration.settings ?? {};
  if (!account_name || !location_id) return NextResponse.json({ error: "Compte Google Business non configuré" }, { status: 400 });

  const locationName = `${account_name}/locations/${location_id}`;
  const reviewsRes = await fetch(
    `https://mybusinessreviews.googleapis.com/v1/${locationName}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!reviewsRes.ok) {
    const err = await reviewsRes.json();
    return NextResponse.json({ error: err.error?.message ?? "Erreur API Google" }, { status: 500 });
  }

  const reviewsData = await reviewsRes.json();
  const googleReviews = reviewsData.reviews ?? [];
  let imported = 0, skipped = 0;

  for (const review of googleReviews) {
    const rating = ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as Record<string, number>)[review.starRating] ?? 3;
    const { error } = await admin.from("reviews").upsert({
      restaurant_id: restaurantId,
      platform: "google",
      external_id: review.reviewId,
      author_name: review.reviewer?.displayName ?? "Anonyme",
      rating,
      content: review.comment ?? null,
      published_at: review.createTime,
      sentiment: rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative",
      reply: review.reviewReply?.comment ?? null,
      replied_at: review.reviewReply?.updateTime ?? null,
    }, { onConflict: "restaurant_id,external_id" });
    if (error) skipped++; else imported++;
  }

  return NextResponse.json({ imported, skipped, total: googleReviews.length });
}

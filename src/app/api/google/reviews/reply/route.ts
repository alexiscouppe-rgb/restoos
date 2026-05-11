import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token ?? null;
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

  const { restaurantId, reviewId, replyText, autoPost } = await request.json();
  // reviewId = external_id Google (reviewId Google)
  // replyText = texte déjà généré (optionnel), sinon on génère
  // autoPost = true → poster directement, false → retourner le texte pour validation

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Charger l'avis
  const { data: review } = await admin
    .from("reviews")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("external_id", reviewId)
    .single();

  if (!review) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });

  // Charger l'intégration Google
  const { data: integration } = await admin
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("platform", "google")
    .single();

  if (!integration) return NextResponse.json({ error: "Google non connecté" }, { status: 400 });

  // Charger les infos du restaurant
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, cuisine_type")
    .eq("id", restaurantId)
    .single();

  // Générer la réponse IA si pas fournie
  let finalReply = replyText;
  if (!finalReply) {
    const stars = "⭐".repeat(review.rating);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Tu es le responsable de ${restaurant?.name ?? "notre restaurant"} (cuisine ${restaurant?.cuisine_type ?? "française"}).
Tu réponds aux avis Google de manière professionnelle, chaleureuse et personnalisée.
Règles :
- Réponds en français
- 2-4 phrases maximum
- Mentionne un détail de l'avis si possible
- Pour les avis négatifs : reste professionnel, empathique, propose de rectifier
- Pour les avis positifs : remercie sincèrement, invite à revenir
- Ne répète jamais la même réponse
- Signe avec le prénom du gérant ou "L'équipe de ${restaurant?.name ?? "notre restaurant"}"`,
        },
        {
          role: "user",
          content: `Avis ${stars} de ${review.author_name} :
"${review.comment ?? "(sans commentaire)"}"

Génère une réponse appropriée.`,
        },
      ],
    });
    finalReply = completion.choices[0].message.content?.trim() ?? "";
  }

  // Si autoPost = false → retourner juste le texte généré pour validation
  if (!autoPost) {
    return NextResponse.json({ reply: finalReply });
  }

  // Poster sur Google
  let accessToken = integration.credentials?.access_token;
  const expiresAt = new Date(integration.credentials?.expires_at ?? 0);
  if (expiresAt <= new Date()) {
    accessToken = await refreshGoogleToken(integration.credentials?.refresh_token);
    if (!accessToken) return NextResponse.json({ error: "Token expiré, reconnectez Google" }, { status: 401 });
    await admin.from("integrations").update({
      credentials: { ...integration.credentials, access_token: accessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() },
    }).eq("id", integration.id);
  }

  const { account_name, location_id } = integration.settings ?? {};
  const locationName = `${account_name}/locations/${location_id}`;
  const replyRes = await fetch(
    `https://mybusinessreviews.googleapis.com/v1/${locationName}/reviews/${reviewId}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: finalReply }),
    }
  );

  if (!replyRes.ok) {
    const err = await replyRes.json();
    return NextResponse.json({ error: err.error?.message ?? "Erreur envoi Google" }, { status: 500 });
  }

  // Mettre à jour en base
  await admin.from("reviews").update({
    owner_reply: finalReply,
    replied_at: new Date().toISOString(),
  }).eq("restaurant_id", restaurantId).eq("external_id", reviewId);

  return NextResponse.json({ success: true, reply: finalReply });
}

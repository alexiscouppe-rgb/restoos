import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Webhook handler générique — reçoit les événements de sources externes.
 * Pattern : ACK immédiat + enqueue pour traitement async.
 *
 * Sources supportées : thefork, zenchef, whatsapp, google, stripe
 * URL : POST /api/webhooks/:source
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params;

  const VALID_SOURCES = ["thefork", "zenchef", "whatsapp", "google", "stripe"];
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  }

  // Stripe a son propre handler
  if (source === "stripe") {
    return NextResponse.redirect(new URL("/api/stripe/webhook", request.url), 307);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    payload = { raw: await request.text() };
  }

  // Extraction du restaurant_id selon la source
  let restaurantId: string | null = null;

  if (source === "thefork") {
    // TheFork envoie l'external_restaurant_id dans le payload
    restaurantId = await resolveRestaurantByExternalId(
      source,
      payload.restaurant_id as string
    );
  } else if (source === "zenchef") {
    restaurantId = await resolveRestaurantByExternalId(
      source,
      payload.establishment_id as string
    );
  } else if (source === "whatsapp") {
    // WhatsApp Business API : identifier le numero de téléphone
    restaurantId = await resolveRestaurantByPhone(
      (payload.entry as any)?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number
    );
  }

  // Logguer l'événement (traitement async par un worker)
  const supabase = createAdminClient();
  await supabase.from("webhook_events").insert({
    restaurant_id: restaurantId,
    source,
    event_type: extractEventType(source, payload),
    payload,
  });

  // ACK immédiat (< 200ms)
  return NextResponse.json({ received: true, queued: true });
}

function extractEventType(source: string, payload: Record<string, unknown>): string {
  switch (source) {
    case "thefork":
      return (payload.event_type as string) ?? "unknown";
    case "zenchef":
      return (payload.type as string) ?? "unknown";
    case "whatsapp":
      return "message.received";
    case "google":
      return (payload.type as string) ?? "unknown";
    default:
      return "unknown";
  }
}

async function resolveRestaurantByExternalId(
  source: string,
  externalId: string
): Promise<string | null> {
  if (!externalId) return null;
  // Dans un vrai setup, une table `integrations` stockerait les mappings
  // Pour le MVP, on cherche dans les meta du restaurant
  return null;
}

async function resolveRestaurantByPhone(phone: string): Promise<string | null> {
  if (!phone) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .single();
  return data?.id ?? null;
}

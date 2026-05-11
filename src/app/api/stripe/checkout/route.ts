import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const PRICE_MAP: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!,
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan") ?? "pro";
  const restaurantId = searchParams.get("restaurant_id");

  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });
  }

  const priceId = PRICE_MAP[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Récupérer ou créer le customer Stripe
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("organization_id, organizations(stripe_customer_id, name)")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const org = restaurant.organizations as unknown as { stripe_customer_id: string | null; name: string } | null;
  let customerId = org?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name ?? "Restaurant",
      metadata: { restaurant_id: restaurantId, user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", restaurant.organization_id);
  }

  // Créer la session Checkout
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing&success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing`,
    metadata: { restaurant_id: restaurantId, plan },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    subscription_data: {
      metadata: { restaurant_id: restaurantId, plan },
      trial_period_days: 0,
    },
  });

  return NextResponse.redirect(session.url!);
}

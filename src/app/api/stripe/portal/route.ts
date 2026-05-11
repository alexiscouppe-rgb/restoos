import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("organizations(stripe_customer_id)")
    .eq("id", restaurantId!)
    .single();

  const org = restaurant?.organizations as unknown as { stripe_customer_id: string | null } | null;
  const customerId = org?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.redirect(new URL("/dashboard/settings", request.url));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing`,
  });

  return NextResponse.redirect(session.url);
}

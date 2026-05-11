import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = session.metadata?.restaurant_id;
      const plan = session.metadata?.plan ?? "starter";

      if (restaurantId) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("organization_id")
          .eq("id", restaurantId)
          .single();

        if (restaurant) {
          await supabase
            .from("organizations")
            .update({
              plan,
              stripe_subscription_id: session.subscription as string,
              subscription_status: "active",
            })
            .eq("id", restaurant.organization_id);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (org) {
        await supabase
          .from("organizations")
          .update({ subscription_status: subscription.status as any })
          .eq("id", org.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (org) {
        await supabase
          .from("organizations")
          .update({
            subscription_status: "canceled",
            plan: "starter",
          })
          .eq("id", org.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", invoice.customer as string)
        .single();

      if (org) {
        await supabase
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("id", org.id);
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

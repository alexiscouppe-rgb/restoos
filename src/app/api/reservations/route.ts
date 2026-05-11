import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/reservations?restaurant_id=xxx&date=2024-01-01
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  const date = searchParams.get("date");
  const status = searchParams.get("status");

  if (!restaurantId) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

  // Vérifier l'accès
  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .not("accepted_at", "is", null)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let query = supabase
    .from("reservations")
    .select("*, contacts(first_name, last_name, phone, email, vip), restaurant_tables(name, capacity)")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (date) query = query.eq("date", date);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/reservations
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { restaurant_id, ...reservationData } = body;

  if (!restaurant_id) return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant_id)
    .not("accepted_at", "is", null)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...reservationData, restaurant_id })
    .select("*, contacts(first_name, last_name), restaurant_tables(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

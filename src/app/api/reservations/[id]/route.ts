import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/reservations/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Récupérer la réservation pour vérifier l'accès
  const { data: existing } = await supabase
    .from("reservations")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", existing.restaurant_id)
    .not("accepted_at", "is", null)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Timestamps automatiques selon le statut
  const now = new Date().toISOString();
  const timestamps: Record<string, string> = {};
  if (body.status === "confirmed" && !body.confirmed_at) timestamps.confirmed_at = now;
  if (body.status === "seated" && !body.seated_at) timestamps.seated_at = now;
  if (body.status === "completed" && !body.completed_at) timestamps.completed_at = now;
  if (body.status === "cancelled" && !body.cancelled_at) timestamps.cancelled_at = now;

  const { data, error } = await supabase
    .from("reservations")
    .update({ ...body, ...timestamps })
    .eq("id", id)
    .eq("restaurant_id", existing.restaurant_id)
    .select("*, contacts(first_name, last_name, phone, email, vip), restaurant_tables(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/reservations/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("reservations")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", existing.restaurant_id)
    .not("accepted_at", "is", null)
    .single();

  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", existing.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").replace(/^"|"$/g, "").trim()]));
  });
}

const VALID_STATUSES = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"];

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

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const restaurantId = formData.get("restaurantId") as string;
  if (!file || !restaurantId) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.date || !row.party_size) { skipped++; continue; }

      const partySize = parseInt(row.party_size);
      if (isNaN(partySize) || partySize < 1) { skipped++; continue; }

      // Construire datetime
      const dateStr = row.date.trim();
      const timeStr = row.time?.trim() || "12:00";
      const reservedAt = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(reservedAt.getTime())) {
        errors.push(`Ligne ${i + 2}: date invalide "${row.date}"`);
        skipped++;
        continue;
      }

      const status = VALID_STATUSES.includes(row.status) ? row.status : "completed";

      // Optionnel : créer ou retrouver le contact
      let contactId: string | null = null;
      if (row.email || row.phone) {
        const { data: existing } = await admin
          .from("contacts")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .or(`email.eq.${row.email || "null"},phone.eq.${row.phone || "null"}`)
          .maybeSingle();

        if (existing) {
          contactId = existing.id;
        } else if (row.first_name || row.last_name || row.email) {
          const { data: newContact } = await admin.from("contacts").insert({
            restaurant_id: restaurantId,
            first_name: row.first_name || null,
            last_name: row.last_name || null,
            email: row.email || null,
            phone: row.phone || null,
            visit_count: 0,
          }).select("id").single();
          contactId = newContact?.id ?? null;
        }
      }

      const { error } = await admin.from("reservations").insert({
        restaurant_id: restaurantId,
        contact_id: contactId,
        guest_name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Inconnu",
        guest_email: row.email || null,
        guest_phone: row.phone || null,
        party_size: partySize,
        reserved_at: reservedAt.toISOString(),
        status,
        notes: row.notes || null,
        source: "import",
      });

      if (error) {
        errors.push(`Ligne ${i + 2}: ${error.message}`);
        skipped++;
      } else {
        imported++;
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}

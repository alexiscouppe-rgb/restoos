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

  for (const row of rows) {
    try {
      if (!row.first_name && !row.last_name && !row.email && !row.phone) { skipped++; continue; }

      const tags = row.tags ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

      const { error } = await admin.from("contacts").insert({
        restaurant_id: restaurantId,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        email: row.email || null,
        phone: row.phone || null,
        is_vip: row.vip === "true" || row.vip === "1" || row.vip === "oui",
        tags,
        notes: row.notes || null,
        visit_count: 0,
      });

      if (error) {
        if (error.code === "23505") { skipped++; } // duplicate
        else { errors.push(`Ligne ${imported + skipped + 1}: ${error.message}`); skipped++; }
      } else {
        imported++;
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}

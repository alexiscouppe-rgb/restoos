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

const VALID_PLATFORMS = ["google", "tripadvisor", "thefork", "yelp", "facebook", "other"];

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
      if (!row.author_name && !row.comment) { skipped++; continue; }

      const rating = parseInt(row.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push(`Ligne ${i + 2}: note invalide "${row.rating}" (doit être entre 1 et 5)`);
        skipped++;
        continue;
      }

      const platform = VALID_PLATFORMS.includes(row.platform?.toLowerCase())
        ? row.platform.toLowerCase()
        : "other";

      let publishedAt = new Date().toISOString();
      if (row.created_at) {
        const parsed = new Date(row.created_at);
        if (!isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
      }

      const { error } = await admin.from("reviews").insert({
        restaurant_id: restaurantId,
        platform,
        external_id: `import_${Date.now()}_${i}`,
        author_name: row.author_name || "Anonyme",
        rating,
        content: row.comment || null,
        published_at: publishedAt,
        url: row.url || null,
        sentiment: rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative",
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

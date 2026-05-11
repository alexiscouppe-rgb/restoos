import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversation_id, restaurant_id, messages } = await request.json();

    // Vérifier l'accès au restaurant
    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant_id)
      .not("accepted_at", "is", null)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Charger les infos du restaurant + knowledge
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, description, cuisine_type, ai_personality, ai_context, city")
      .eq("id", restaurant_id)
      .single();

    // Charger le knowledge pertinent (RAG léger)
    const { data: knowledge } = await supabase
      .from("ai_knowledge_chunks")
      .select("title, content, category")
      .eq("restaurant_id", restaurant_id)
      .eq("is_active", true)
      .limit(5);

    const knowledgeText = knowledge?.map(k =>
      `[${k.category}] ${k.title}: ${k.content}`
    ).join("\n\n") ?? "";

    // Construire le prompt système
    const systemPrompt = `Tu es l'assistant virtuel de "${restaurant?.name}", un restaurant ${restaurant?.cuisine_type ?? ""} à ${restaurant?.city ?? "Paris"}.

${restaurant?.description ? `Description : ${restaurant.description}` : ""}

${restaurant?.ai_personality ? `Personnalité : ${restaurant.ai_personality}` : ""}

${knowledgeText ? `\n📚 Informations sur le restaurant :\n${knowledgeText}` : ""}

Tes règles :
- Réponds toujours en français, de façon chaleureuse et professionnelle
- Sois concis (2-4 phrases max)
- Si tu ne sais pas quelque chose, dis-le poliment et propose d'appeler le restaurant
- Ne confirme JAMAIS une réservation par ici — renvoie vers le système de réservation
- Adapte le ton selon le canal (WhatsApp = plus décontracté, Email = plus formel)`;

    // Convertir les messages en format OpenAI
    const chatMessages = messages.map((m: { sender_type: string; content: string }) => ({
      role: m.sender_type === "customer" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatMessages,
        {
          role: "user",
          content: "[INTERNAL] Génère une réponse professionnelle pour ce dernier message client.",
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI suggest-reply error:", error);
    return NextResponse.json(
      { error: "Impossible de générer une réponse" },
      { status: 500 }
    );
  }
}

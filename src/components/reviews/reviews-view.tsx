"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Star, Sparkles, Loader2, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Review, ReviewPlatform } from "@/lib/types";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3.5 w-3.5",
            s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

const platformColors: Record<ReviewPlatform, string> = {
  google: "bg-blue-500/10 text-blue-600",
  tripadvisor: "bg-emerald-500/10 text-emerald-600",
  thefork: "bg-orange-500/10 text-orange-600",
  internal: "bg-muted text-muted-foreground",
};

export function ReviewsView({ initialReviews, restaurantId }: { initialReviews: Review[]; restaurantId: string }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const filtered = reviews.filter(r =>
    filter === "all" ? true : r.reply === null
  );

  async function generateAIDraft(review: Review) {
    setLoadingAI(review.id);
    try {
      const res = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          conversation_id: null,
          messages: [
            {
              sender_type: "customer",
              content: `Avis ${review.rating}/5 de ${review.author_name}: ${review.content}`,
            },
          ],
        }),
      });
      const { reply } = await res.json();
      setReplyText(prev => ({ ...prev, [review.id]: reply }));
      setReplyingTo(review.id);
    } catch {
      toast.error("Impossible de générer une réponse IA");
    }
    setLoadingAI(null);
  }

  async function submitReply(reviewId: string) {
    const text = replyText[reviewId];
    if (!text?.trim()) return;
    setSendingReply(reviewId);

    const supabase = createClient();
    const { error } = await supabase
      .from("reviews")
      .update({ reply: text.trim(), replied_at: new Date().toISOString() })
      .eq("id", reviewId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setReviews(prev =>
        prev.map(r => r.id === reviewId ? { ...r, reply: text.trim(), replied_at: new Date().toISOString() } : r)
      );
      setReplyingTo(null);
      toast.success("Réponse enregistrée");
    }
    setSendingReply(null);
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const pendingCount = reviews.filter(r => !r.reply).length;

  const ratingDist = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Avis clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {reviews.length} avis · {pendingCount} en attente de réponse
          </p>
        </div>

        {/* Rating summary */}
        {reviews.length > 0 && (
          <div className="hidden sm:flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground tabular-nums">{avgRating}</p>
              <StarRating rating={Math.round(parseFloat(avgRating as string))} />
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} avis</p>
            </div>
            <div className="space-y-1 w-28">
              {ratingDist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-3">{star}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-all",
            filter === "pending" ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-accent")}
        >
          Sans réponse {pendingCount > 0 && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-xs", filter === "pending" ? "bg-white/20" : "bg-primary/10 text-primary")}>{pendingCount}</span>}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={cn("rounded-xl px-4 py-2 text-sm font-medium transition-all",
            filter === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-accent")}
        >
          Tous les avis
        </button>
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500/50 mb-3" />
            <p className="font-medium text-muted-foreground">Tous les avis ont une réponse 🎉</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                {/* Meta */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Avatar initiales */}
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold select-none">
                        {r.author_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{r.author_name}</span>
                          <StarRating rating={r.rating} />
                          <span className={cn(
                            "text-xs font-bold rounded-full px-1.5 py-0.5",
                            r.rating >= 4 ? "text-emerald-600 bg-emerald-500/10"
                              : r.rating === 3 ? "text-amber-600 bg-amber-500/10"
                              : "text-red-600 bg-red-500/10"
                          )}>
                            {r.rating}/5
                          </span>
                          <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium capitalize", platformColors[r.platform])}>
                            {r.platform}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(r.published_at), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {r.reply && (
                    <span className="flex-shrink-0 text-xs bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5 font-medium border border-emerald-500/20">
                      ✓ Répondu
                    </span>
                  )}
                </div>

                {/* Content */}
                {r.content && (
                  <p className="mt-3 text-sm text-foreground leading-relaxed">{r.content}</p>
                )}

                {/* Existing reply */}
                {r.reply && (
                  <div className="mt-4 rounded-xl bg-muted/50 p-3 border-l-2 border-primary">
                    <p className="text-xs font-medium text-primary mb-1">Votre réponse</p>
                    <p className="text-sm text-foreground">{r.reply}</p>
                  </div>
                )}

                {/* Reply area */}
                {!r.reply && (
                  <div className="mt-4 space-y-2">
                    {replyingTo === r.id ? (
                      <>
                        <textarea
                          value={replyText[r.id] ?? ""}
                          onChange={(e) => setReplyText(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Votre réponse…"
                          rows={3}
                          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => submitReply(r.id)}
                            disabled={!!sendingReply}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                          >
                            {sendingReply === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Publier
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setReplyingTo(r.id); setReplyText(prev => ({ ...prev, [r.id]: prev[r.id] ?? "" })); }}
                          className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Répondre
                        </button>
                        <button
                          onClick={() => generateAIDraft(r)}
                          disabled={loadingAI === r.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-3 py-2 text-xs font-semibold hover:bg-primary/20 transition-colors"
                        >
                          {loadingAI === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Réponse IA
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

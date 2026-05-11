"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, MessageSquare, Instagram, Mail, Phone,
  Send, Sparkles, Loader2, CheckCheck, User,
  Filter, RefreshCw
} from "lucide-react";
import type { Conversation, Message, ConversationChannel, ConversationStatus } from "@/lib/types";
import { toast } from "sonner";

interface InboxViewProps {
  initialConversations: Conversation[];
  restaurantId: string;
  currentUserId: string;
}

const channelIcon: Record<ConversationChannel, React.ElementType> = {
  whatsapp: Phone,
  instagram: Instagram,
  email: Mail,
  sms: MessageSquare,
  google: MessageSquare,
  internal: MessageSquare,
};

const channelColor: Record<ConversationChannel, string> = {
  whatsapp: "text-emerald-500 bg-emerald-500/10",
  instagram: "text-pink-500 bg-pink-500/10",
  email: "text-blue-500 bg-blue-500/10",
  sms: "text-purple-500 bg-purple-500/10",
  google: "text-orange-500 bg-orange-500/10",
  internal: "text-muted-foreground bg-muted",
};

const statusTabs: { value: ConversationStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "open", label: "Ouvertes" },
  { value: "pending", label: "En attente" },
  { value: "resolved", label: "Résolues" },
];

export function InboxView({ initialConversations, restaurantId, currentUserId }: InboxViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("open");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (selected && msg.conversation_id === selected.id) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, selected]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function loadMessages(conversation: Conversation) {
    setSelected(conversation);
    setLoadingMessages(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: true })
      .limit(100);

    setMessages(data ?? []);
    setLoadingMessages(false);
    scrollToBottom();

    // Marquer comme lu
    if (conversation.unread_count > 0) {
      await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversation.id);

      setConversations((prev) =>
        prev.map((c) => c.id === conversation.id ? { ...c, unread_count: 0 } : c)
      );
    }
  }

  async function sendMessage() {
    if (!selected || !newMessage.trim()) return;
    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selected.id,
        restaurant_id: restaurantId,
        sender_type: "staff",
        sender_id: currentUserId,
        content: newMessage.trim(),
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      setMessages((prev) => [...prev, data as Message]);
      setNewMessage("");
      scrollToBottom();

      // Update conversation preview
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: newMessage.trim().slice(0, 120),
          status: "open",
        })
        .eq("id", selected.id);
    }
    setSending(false);
  }

  async function generateAIReply() {
    if (!selected) return;
    setGeneratingAI(true);

    try {
      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selected.id,
          restaurant_id: restaurantId,
          messages: messages.slice(-10),
        }),
      });

      const { reply, error } = await response.json();
      if (error) throw new Error(error);

      setNewMessage(reply);
    } catch {
      toast.error("Impossible de générer une réponse IA");
    }
    setGeneratingAI(false);
  }

  async function resolveConversation() {
    if (!selected) return;
    await supabase
      .from("conversations")
      .update({ status: "resolved" })
      .eq("id", selected.id);

    setConversations((prev) =>
      prev.map((c) => c.id === selected.id ? { ...c, status: "resolved" } : c)
    );
    toast.success("Conversation résolue");
  }

  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const contact = c.contact as { first_name?: string; last_name?: string } | undefined;
      const name = contact
        ? `${contact.first_name} ${contact.last_name ?? ""}`.toLowerCase()
        : "";
      const preview = (c.last_message_preview ?? "").toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || preview.includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-border overflow-hidden bg-card animate-fade-in">
      {/* Sidebar conversations */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <h2 className="font-semibold text-foreground">Inbox</h2>

          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-xs focus:outline-none text-foreground"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {statusTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatusFilter(t.value)}
                className={cn(
                  "flex-1 rounded-lg py-1 text-xs font-medium transition-all",
                  statusFilter === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const Icon = channelIcon[c.channel];
              const iconColor = channelColor[c.channel];
              const contact = c.contact as { first_name?: string; last_name?: string } | undefined;
              const name = contact
                ? `${contact.first_name} ${contact.last_name ?? ""}`.trim()
                : "Client inconnu";

              return (
                <button
                  key={c.id}
                  onClick={() => loadMessages(c)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                    selected?.id === c.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5", iconColor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-sm font-medium text-foreground truncate">{name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {c.last_message_at
                          ? formatDistanceToNow(new Date(c.last_message_at), { locale: fr, addSuffix: false })
                          : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.last_message_preview || "Aucun message"}
                    </p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="flex-shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation panel */}
      {selected ? (
        <div className="flex flex-1 flex-col min-w-0">
          {/* Conv header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = channelIcon[selected.channel];
                const color = channelColor[selected.channel];
                const contact = selected.contact as { first_name?: string; last_name?: string; vip?: boolean } | undefined;
                const name = contact
                  ? `${contact.first_name} ${contact.last_name ?? ""}`.trim()
                  : "Client inconnu";
                return (
                  <>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0", color)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{name}</h3>
                        {contact?.is_vip && (
                          <span className="text-xs bg-yellow-500/10 text-yellow-600 rounded-full px-2 py-0.5 font-medium">VIP</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{selected.channel} · {selected.status}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              onClick={resolveConversation}
              disabled={selected.status === "resolved"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Résoudre
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun message dans cette conversation</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isStaff = msg.sender_type === "staff" || msg.sender_type === "ai";
                return (
                  <div key={msg.id} className={cn("flex gap-3", isStaff && "flex-row-reverse")}>
                    {/* Avatar */}
                    <div className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      isStaff
                        ? msg.sender_type === "ai"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {msg.sender_type === "ai" ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3 text-sm",
                      isStaff
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1.5 text-xs",
                        isStaff ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"
                      )}>
                        {formatDistanceToNow(new Date(msg.sent_at), { locale: fr, addSuffix: true })}
                        {msg.sender_type === "ai" && (
                          <span className="flex items-center gap-0.5 ml-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            IA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 flex-shrink-0">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-2xl border border-input bg-background overflow-hidden">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Répondre au client…"
                  rows={2}
                  className="w-full resize-none px-4 py-3 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <button
                    onClick={generateAIReply}
                    disabled={generatingAI}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                  >
                    {generatingAI ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generatingAI ? "Génération…" : "Suggestion IA"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    ↵ Envoyer · Shift+↵ Newline
                  </span>
                </div>
              </div>

              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Sélectionnez une conversation</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              pour lire et répondre aux messages
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

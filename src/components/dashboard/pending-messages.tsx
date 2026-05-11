"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ArrowRight, MessageSquare, Instagram, Mail, Phone } from "lucide-react";
import type { ConversationChannel } from "@/lib/types";

interface ConversationRow {
  id: string;
  channel: ConversationChannel;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  contacts?: { first_name: string; last_name: string | null } | null;
}

const channelConfig: Record<
  ConversationChannel,
  { icon: React.ElementType; label: string; color: string }
> = {
  whatsapp: {
    icon: Phone,
    label: "WhatsApp",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    color: "text-pink-500 bg-pink-500/10",
  },
  email: {
    icon: Mail,
    label: "Email",
    color: "text-blue-500 bg-blue-500/10",
  },
  sms: {
    icon: MessageSquare,
    label: "SMS",
    color: "text-purple-500 bg-purple-500/10",
  },
  google: {
    icon: MessageSquare,
    label: "Google",
    color: "text-orange-500 bg-orange-500/10",
  },
  internal: {
    icon: MessageSquare,
    label: "Interne",
    color: "text-muted-foreground bg-muted",
  },
};

export function PendingMessages({
  conversations,
}: {
  conversations: ConversationRow[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden h-fit">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">Messages ouverts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/inbox"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          Inbox
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucun message en attente
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((c) => {
            const cfg = channelConfig[c.channel];
            const name = c.contacts
              ? `${c.contacts.first_name}${c.contacts.last_name ? " " + c.contacts.last_name : ""}`
              : "Client inconnu";

            return (
              <Link
                key={c.id}
                href={`/dashboard/inbox/${c.id}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors"
              >
                {/* Channel icon */}
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5",
                    cfg.color
                  )}
                >
                  <cfg.icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {name}
                    </p>
                    {c.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(c.last_message_at), {
                          locale: fr,
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.last_message_preview || "Aucun message"}
                  </p>
                </div>

                {/* Unread badge */}
                {c.unread_count > 0 && (
                  <div className="flex-shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
                    {c.unread_count}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

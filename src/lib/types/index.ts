// ===================================
// RestoOS — Types globaux
// ===================================

export type UserRole = "owner" | "manager" | "staff" | "readonly";
export type Plan = "starter" | "pro" | "enterprise";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";
export type ConversationChannel =
  | "whatsapp"
  | "instagram"
  | "email"
  | "sms"
  | "google"
  | "internal";
export type ConversationStatus = "open" | "pending" | "resolved" | "archived";
export type MessageSender = "customer" | "staff" | "ai";
export type ReviewPlatform =
  | "google"
  | "tripadvisor"
  | "thefork"
  | "internal";

// ─── Organization ────────────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | null;
  trial_ends_at: string | null;
  created_at: string;
}

// ─── Restaurant ───────────────────────────────────────────────────────────────
export interface Restaurant {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_type: string | null;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  timezone: string;
  currency: string;
  // Paramètres réservations
  reservation_duration_minutes: number;
  max_party_size: number;
  booking_lead_time_hours: number;
  booking_advance_days: number;
  // IA
  ai_personality: string | null;
  ai_context: string | null; // RAG context résumé
  ai_enabled: boolean;
  auto_reply_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Restaurant Member (accès multi-restaurant) ───────────────────────────────
export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

// ─── Table (plan de salle) ────────────────────────────────────────────────────
export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  name: string;
  capacity: number;
  min_capacity: number;
  section: string | null; // "Terrasse", "Salle", "Privé"
  is_active: boolean;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}

// ─── Contact (client du restaurant) ──────────────────────────────────────────
export interface Contact {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  total_visits: number;
  total_no_shows: number;
  last_visit_at: string | null;
  is_vip: boolean;
  blacklisted: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Reservation ─────────────────────────────────────────────────────────────
export interface Reservation {
  id: string;
  restaurant_id: string;
  contact_id: string | null;
  table_id: string | null;
  // Guest info (snapshot au moment de la résa)
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  party_size: number;
  // Timing
  reserved_at: string; // ISO datetime (YYYY-MM-DDTHH:MM:SS)
  duration_minutes: number;
  // Statut
  status: ReservationStatus;
  source: "manual" | "thefork" | "zenchef" | "google" | "widget" | "phone";
  external_id: string | null; // ID sur la plateforme source
  // Extras
  special_requests: string | null;
  internal_notes: string | null;
  allergies: string | null;
  occasion: string | null;
  // Flux
  confirmed_at: string | null;
  reminded_at: string | null;
  seated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations (Supabase joins)
  contacts?: { first_name: string; last_name: string | null; phone: string | null; email: string | null; is_vip: boolean } | null;
  restaurant_tables?: { name: string; capacity: number } | null;
}

// ─── Conversation (inbox) ─────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  restaurant_id: string;
  contact_id: string | null;
  channel: ConversationChannel;
  channel_contact_id: string | null; // Ex: numéro WhatsApp, username IG
  status: ConversationStatus;
  subject: string | null;
  assigned_to: string | null; // user_id
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  ai_handled: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: Contact;
  messages?: Message[];
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversation_id: string;
  restaurant_id: string;
  sender_type: MessageSender;
  sender_id: string | null; // user_id si staff
  content: string;
  attachments: Attachment[];
  external_id: string | null;
  sent_at: string;
  read_at: string | null;
  ai_confidence: number | null; // 0-1 si message IA
  created_at: string;
}

export interface Attachment {
  type: "image" | "document" | "audio" | "video";
  url: string;
  name: string;
  size: number;
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  restaurant_id: string;
  contact_id: string | null;
  platform: ReviewPlatform;
  external_id: string | null;
  author_name: string;
  rating: number; // 1-5
  content: string | null;
  reply: string | null;
  replied_at: string | null;
  ai_reply_draft: string | null;
  published_at: string;
  created_at: string;
}

// ─── Contexte Tenant (app) ────────────────────────────────────────────────────
export interface TenantContext {
  userId: string;
  restaurantId: string;
  role: UserRole;
  plan: Plan;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  today_reservations: number;
  today_covers: number;
  pending_messages: number;
  pending_reviews: number;
  revenue_this_month: number;
  occupancy_rate: number;
  no_show_rate: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

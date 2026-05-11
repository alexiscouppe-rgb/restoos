-- ============================================================
-- RestoOS — Schéma initial complet
-- Migration 001
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pour RAG (pgvector)

-- ============================================================
-- ORGANIZATIONS (tenant racine)
-- ============================================================
CREATE TABLE public.organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  subscription_status     TEXT CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE public.restaurants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  cuisine_type    TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT NOT NULL DEFAULT 'FR',
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  logo_url        TEXT,
  cover_url       TEXT,
  timezone        TEXT NOT NULL DEFAULT 'Europe/Paris',
  currency        TEXT NOT NULL DEFAULT 'EUR',
  -- Réservations
  reservation_duration_minutes  INTEGER NOT NULL DEFAULT 90,
  max_party_size               INTEGER NOT NULL DEFAULT 20,
  booking_lead_time_hours       INTEGER NOT NULL DEFAULT 2,
  booking_advance_days          INTEGER NOT NULL DEFAULT 60,
  -- IA
  ai_personality        TEXT,
  ai_context            TEXT,
  ai_enabled            BOOLEAN NOT NULL DEFAULT true,
  auto_reply_enabled    BOOLEAN NOT NULL DEFAULT false,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurants_organization ON public.restaurants(organization_id);
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);

-- ============================================================
-- RESTAURANT MEMBERS (accès utilisateurs)
-- ============================================================
CREATE TABLE public.restaurant_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'readonly')),
  invited_by      UUID REFERENCES auth.users(id),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX idx_restaurant_members_user ON public.restaurant_members(user_id);
CREATE INDEX idx_restaurant_members_restaurant ON public.restaurant_members(restaurant_id);

-- ============================================================
-- RESTAURANT TABLES (plan de salle)
-- ============================================================
CREATE TABLE public.restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  capacity        INTEGER NOT NULL DEFAULT 4,
  min_capacity    INTEGER NOT NULL DEFAULT 1,
  section         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  position_x      FLOAT,
  position_y      FLOAT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tables_restaurant ON public.restaurant_tables(restaurant_id);

-- ============================================================
-- CONTACTS (clients)
-- ============================================================
CREATE TABLE public.contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  total_visits    INTEGER NOT NULL DEFAULT 0,
  total_no_shows  INTEGER NOT NULL DEFAULT 0,
  last_visit_at   TIMESTAMPTZ,
  vip             BOOLEAN NOT NULL DEFAULT false,
  blacklisted     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_restaurant ON public.contacts(restaurant_id);
CREATE INDEX idx_contacts_email ON public.contacts(restaurant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON public.contacts(restaurant_id, phone) WHERE phone IS NOT NULL;

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE public.reservations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  table_id        UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  -- Guest info (snapshot)
  guest_name      TEXT NOT NULL,
  guest_email     TEXT,
  guest_phone     TEXT,
  party_size      INTEGER NOT NULL CHECK (party_size > 0),
  -- Timing
  date            DATE NOT NULL,
  time            TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  -- Statut
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  source          TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'thefork', 'zenchef', 'google', 'widget', 'phone')),
  external_id     TEXT,
  -- Extras
  special_requests TEXT,
  internal_notes   TEXT,
  allergies        TEXT,
  occasion         TEXT,
  -- Flux
  confirmed_at    TIMESTAMPTZ,
  reminded_at     TIMESTAMPTZ,
  seated_at       TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_restaurant ON public.reservations(restaurant_id);
CREATE INDEX idx_reservations_date ON public.reservations(restaurant_id, date);
CREATE INDEX idx_reservations_status ON public.reservations(restaurant_id, status);
CREATE INDEX idx_reservations_contact ON public.reservations(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_reservations_external ON public.reservations(source, external_id) WHERE external_id IS NOT NULL;

-- ============================================================
-- CONVERSATIONS (inbox omnicanale)
-- ============================================================
CREATE TABLE public.conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL
    CHECK (channel IN ('whatsapp', 'instagram', 'email', 'sms', 'google', 'internal')),
  channel_contact_id TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  subject         TEXT,
  assigned_to     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  ai_handled      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_restaurant ON public.conversations(restaurant_id);
CREATE INDEX idx_conversations_status ON public.conversations(restaurant_id, status);
CREATE INDEX idx_conversations_last_message ON public.conversations(restaurant_id, last_message_at DESC);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id) WHERE contact_id IS NOT NULL;

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff', 'ai')),
  sender_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  attachments     JSONB NOT NULL DEFAULT '[]',
  external_id     TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at         TIMESTAMPTZ,
  ai_confidence   FLOAT CHECK (ai_confidence BETWEEN 0 AND 1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_restaurant ON public.messages(restaurant_id);

-- ============================================================
-- REVIEWS (avis)
-- ============================================================
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL
    CHECK (platform IN ('google', 'tripadvisor', 'thefork', 'internal')),
  external_id     TEXT,
  author_name     TEXT NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         TEXT,
  reply           TEXT,
  replied_at      TIMESTAMPTZ,
  ai_reply_draft  TEXT,
  published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX idx_reviews_platform ON public.reviews(restaurant_id, platform);
CREATE INDEX idx_reviews_no_reply ON public.reviews(restaurant_id, published_at DESC) WHERE reply IS NULL;

-- ============================================================
-- AI CONTEXT (RAG léger par restaurant)
-- ============================================================
CREATE TABLE public.ai_knowledge_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,  -- 'menu', 'horaires', 'politique', 'info', etc.
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  embedding       vector(1536),   -- OpenAI text-embedding-3-small
  tokens          INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_restaurant ON public.ai_knowledge_chunks(restaurant_id);
CREATE INDEX idx_knowledge_embedding ON public.ai_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- AI CONVERSATIONS HISTORY (mémoire IA)
-- ============================================================
CREATE TABLE public.ai_conversation_summaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,
  key_info        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_summaries_restaurant ON public.ai_conversation_summaries(restaurant_id);

-- ============================================================
-- WEBHOOKS (intégrations externes)
-- ============================================================
CREATE TABLE public.webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,  -- 'thefork', 'zenchef', 'stripe', 'whatsapp', etc.
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_source ON public.webhook_events(source, created_at DESC);
CREATE INDEX idx_webhooks_unprocessed ON public.webhook_events(created_at)
  WHERE processed_at IS NULL;

-- ============================================================
-- HELPER FUNCTION — restaurant_ids accessibles par l'user
-- ============================================================
CREATE OR REPLACE FUNCTION public.auth_restaurant_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT rm.restaurant_id
      FROM public.restaurant_members rm
      WHERE rm.user_id = auth.uid()
        AND rm.accepted_at IS NOT NULL
    ),
    ARRAY[]::UUID[]
  );
$$;

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- Restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_tenant_isolation" ON public.restaurants
  FOR ALL USING (id = ANY(public.auth_restaurant_ids()));

-- Restaurant Members
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_own_access" ON public.restaurant_members
  FOR ALL USING (
    restaurant_id = ANY(public.auth_restaurant_ids())
    OR user_id = auth.uid()
  );

-- Restaurant Tables
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_tenant_isolation" ON public.restaurant_tables
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_tenant_isolation" ON public.contacts
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_tenant_isolation" ON public.reservations
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_tenant_isolation" ON public.conversations
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_tenant_isolation" ON public.messages
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_tenant_isolation" ON public.reviews
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- AI Knowledge
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_tenant_isolation" ON public.ai_knowledge_chunks
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- AI Summaries
ALTER TABLE public.ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_summaries_tenant_isolation" ON public.ai_conversation_summaries
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Organizations (accessible via le restaurant)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_via_restaurant" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT r.organization_id
      FROM public.restaurants r
      WHERE r.id = ANY(public.auth_restaurant_ids())
    )
  );

-- ============================================================
-- TRIGGERS — updated_at auto
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRIGGER — Créer organization + restaurant_member au signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Créer une organization par défaut
  INSERT INTO public.organizations (name, plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Restaurant',
    'starter',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO v_org_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RestoOS — Migration 002 — Intégrations externes
-- ============================================================

-- Table pour mapper les plateformes externes aux restaurants
CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('thefork', 'zenchef', 'google', 'whatsapp', 'instagram', 'tripadvisor')),
  external_id     TEXT NOT NULL,  -- ID du restaurant sur la plateforme
  credentials     JSONB,           -- Tokens chiffrés (JAMAIS en clair en prod)
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, platform)
);

CREATE INDEX idx_integrations_restaurant ON public.integrations(restaurant_id);
CREATE INDEX idx_integrations_platform ON public.integrations(platform, external_id);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_tenant_isolation" ON public.integrations
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();cd "/Users/macbook/Desktop/SAAS Restaurant/restoos"
npm run dev


-- Table notifications (push / email / SMS sortants)
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  reservation_id  UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('confirmation', 'reminder', 'cancellation', 'custom')),
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  subject         TEXT,
  content         TEXT NOT NULL,
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_restaurant ON public.notifications(restaurant_id);
CREATE INDEX idx_notifications_reservation ON public.notifications(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX idx_notifications_pending ON public.notifications(created_at) WHERE status = 'pending';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_tenant_isolation" ON public.notifications
  FOR ALL USING (restaurant_id = ANY(public.auth_restaurant_ids()));

-- Vue matérialisée — Dashboard stats rapides
CREATE MATERIALIZED VIEW public.restaurant_daily_stats AS
  SELECT
    restaurant_id,
    date,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'seated', 'completed')) AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
    SUM(party_size) FILTER (WHERE status IN ('confirmed', 'seated', 'completed')) AS total_covers,
    COUNT(*) AS total_reservations
  FROM public.reservations
  GROUP BY restaurant_id, date;

CREATE UNIQUE INDEX ON public.restaurant_daily_stats(restaurant_id, date);

-- Fonction refresh stats (appeler via pg_cron ou manuellement)
CREATE OR REPLACE FUNCTION public.refresh_daily_stats()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.restaurant_daily_stats;
END;
$$;

-- Index de recherche full-text sur les contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      COALESCE(first_name, '') || ' ' ||
      COALESCE(last_name, '') || ' ' ||
      COALESCE(email, '') || ' ' ||
      COALESCE(phone, '')
    )
  ) STORED;

CREATE INDEX idx_contacts_search ON public.contacts USING gin(search_vector);

-- Index recherche réservations
CREATE INDEX IF NOT EXISTS idx_reservations_guest_search ON public.reservations
  USING gin(to_tsvector('french', guest_name || ' ' || COALESCE(guest_phone, '') || ' ' || COALESCE(guest_email, '')));

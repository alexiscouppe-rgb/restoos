-- ============================================================
-- RestoOS — Migration 003 — Fix RLS onboarding
-- Problème : les policies FOR ALL bloquent les INSERT pendant
-- l'onboarding car auth_restaurant_ids() retourne [] (vide)
-- au moment où le restaurant n'existe pas encore.
-- Solution : séparer les policies SELECT/UPDATE/DELETE des INSERT
-- ============================================================

-- ── ORGANIZATIONS ────────────────────────────────────────────

-- Supprimer l'ancienne policy ALL
DROP POLICY IF EXISTS "organizations_via_restaurant" ON public.organizations;

-- SELECT : via restaurant membership (inchangé)
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT r.organization_id
      FROM public.restaurants r
      WHERE r.id = ANY(public.auth_restaurant_ids())
    )
  );

-- INSERT : tout utilisateur authentifié peut créer son org
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE : via restaurant membership
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT r.organization_id
      FROM public.restaurants r
      WHERE r.id = ANY(public.auth_restaurant_ids())
    )
  );

-- ── RESTAURANTS ──────────────────────────────────────────────

DROP POLICY IF EXISTS "restaurants_tenant_isolation" ON public.restaurants;

-- SELECT/UPDATE/DELETE : via membership
CREATE POLICY "restaurants_select" ON public.restaurants
  FOR SELECT USING (id = ANY(public.auth_restaurant_ids()));

-- INSERT : tout utilisateur authentifié (onboarding)
CREATE POLICY "restaurants_insert" ON public.restaurants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "restaurants_update" ON public.restaurants
  FOR UPDATE USING (id = ANY(public.auth_restaurant_ids()));

CREATE POLICY "restaurants_delete" ON public.restaurants
  FOR DELETE USING (id = ANY(public.auth_restaurant_ids()));

-- ── RESTAURANT MEMBERS ───────────────────────────────────────

DROP POLICY IF EXISTS "members_own_access" ON public.restaurant_members;

-- SELECT : accès au restaurant OU c'est son propre record
CREATE POLICY "members_select" ON public.restaurant_members
  FOR SELECT USING (
    restaurant_id = ANY(public.auth_restaurant_ids())
    OR user_id = auth.uid()
  );

-- INSERT : un user peut s'ajouter lui-même (onboarding owner)
CREATE POLICY "members_insert" ON public.restaurant_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE/DELETE : via restaurant membership
CREATE POLICY "members_update" ON public.restaurant_members
  FOR UPDATE USING (
    restaurant_id = ANY(public.auth_restaurant_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY "members_delete" ON public.restaurant_members
  FOR DELETE USING (
    restaurant_id = ANY(public.auth_restaurant_ids())
    AND user_id != auth.uid() -- on ne peut pas se supprimer soi-même
  );

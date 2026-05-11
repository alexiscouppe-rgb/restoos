# RestoOS — Guide de démarrage

## Stack
- **Next.js 15** (App Router + TypeScript)
- **Supabase** (PostgreSQL + Auth + Realtime + RLS)
- **TailwindCSS** + design system Apple-like
- **OpenAI GPT-4o-mini** (réponses IA)
- **Stripe** (abonnements)

---

## 1. Installation

```bash
cd restoos
npm install
cp .env.example .env.local
```

---

## 2. Variables d'environnement

Éditer `.env.local` avec vos clés :

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase → Settings → API → URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase → Settings → API → anon key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase → Settings → API → service_role
OPENAI_API_KEY=                   # platform.openai.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 3. Base de données Supabase

### Option A — Supabase CLI (recommandé)
```bash
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Option B — SQL Editor
1. Ouvrir **Supabase Dashboard → SQL Editor**
2. Copier/coller le contenu de `supabase/migrations/001_initial_schema.sql`
3. Exécuter

---

## 4. Extension pgvector (pour le RAG IA)

Dans Supabase Dashboard → Database → Extensions → Activer **vector**

---

## 5. Lancer en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 6. Architecture des fichiers

```
restoos/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Connexion
│   │   │   ├── signup/page.tsx         # Inscription
│   │   │   └── callback/route.ts       # OAuth callback
│   │   ├── onboarding/page.tsx         # Création restaurant
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Layout sidebar
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── reservations/page.tsx   # Réservations
│   │   │   ├── inbox/page.tsx          # Inbox messages
│   │   │   ├── reviews/page.tsx        # Avis clients
│   │   │   └── contacts/page.tsx       # Base clients
│   │   └── api/
│   │       └── ai/suggest-reply/       # API IA
│   ├── components/
│   │   ├── layout/                     # Sidebar, Topbar, ThemeProvider
│   │   ├── dashboard/                  # StatCard, RecentReservations...
│   │   ├── reservations/               # CRUD réservations
│   │   ├── inbox/                      # Inbox omnicanale
│   │   ├── reviews/                    # Gestion avis
│   │   └── onboarding/                 # Wizard création
│   ├── lib/
│   │   ├── supabase/                   # client.ts, server.ts, middleware.ts
│   │   ├── types/index.ts              # Types TypeScript stricts
│   │   └── utils.ts                    # Helpers
│   └── middleware.ts                   # Auth protection
├── supabase/migrations/               # Schéma SQL complet
└── .env.example
```

---

## 7. Phases suivantes

| Phase | Feature | Statut |
|-------|---------|--------|
| ✅ Foundation | Next.js + Tailwind + Supabase + Auth | Fait |
| ✅ Phase 1 | Dashboard + Onboarding | Fait |
| ✅ Phase 2 | Réservations (CRUD + statuts) | Fait |
| ✅ Phase 3 | Inbox omnicanale + IA | Fait |
| 🔄 Phase 4 | Contacts + Analytics | Prochain |
| 🔄 Phase 5 | Intégrations (TheFork, Zenchef) | Prochain |
| 🔄 Phase 6 | Stripe abonnements | Prochain |

---

## 8. Déploiement Vercel

```bash
npm run build       # Vérifier le build localement
vercel deploy       # Deploy preview
vercel --prod       # Production
```

Variables d'environnement à configurer dans Vercel Dashboard.

---

## 9. Supabase Realtime (Inbox)

L'inbox utilise Supabase Realtime pour les messages en direct.
Activer dans Supabase → Database → Replication → `messages` table.

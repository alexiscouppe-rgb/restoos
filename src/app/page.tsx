import Link from "next/link";
import { ArrowRight, Zap, MessageSquare, Calendar, Star } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground tracking-tight">
            RestoOS
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Commencer gratuitement
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            Propulsé par GPT-4o
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
            L&apos;OS de votre
            <span className="text-primary"> restaurant</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
            Centralisez réservations, messages et avis en une interface.
            L&apos;IA répond à vos clients, vous gérez votre cuisine.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Essai gratuit 14 jours
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Voir une démo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-4xl grid grid-cols-3 gap-8 text-center">
          {[
            { value: "3h", label: "Économisées / jour" },
            { value: "98%", label: "Taux de réponse" },
            { value: "< 2min", label: "Temps de réponse moyen" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-bold text-primary mb-1">
                {s.value}
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    title: "Inbox omnicanale",
    description:
      "WhatsApp, Instagram, email, SMS — tous vos messages en une seule interface. Zéro onglet manqué.",
    icon: MessageSquare,
  },
  {
    title: "Réservations unifiées",
    description:
      "TheFork, Zenchef, Google Reserve synchronisés en temps réel. Fini les doubles réservations.",
    icon: Calendar,
  },
  {
    title: "IA contextuelle",
    description:
      "L'IA connaît votre restaurant par cœur. Elle répond comme vous — en mieux et en 30 secondes.",
    icon: Star,
  },
];

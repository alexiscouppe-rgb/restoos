"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Utensils } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect"
        : error.message
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/8 via-background to-primary/4 items-center justify-center border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl mb-6">
            <Utensils className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">RestoOS</h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-xs mx-auto">
            La plateforme tout-en-un pour gérer votre restaurant avec l'IA.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "Réservations", desc: "Gérez vos tables" },
              { label: "Avis Google", desc: "Réponses automatiques" },
              { label: "Inbox unifiée", desc: "Tous vos messages" },
              { label: "Analytics", desc: "Données en temps réel" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Utensils className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">RestoOS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Bon retour 👋</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Connectez-vous à votre espace restaurant
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@restaurant.fr"
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <Link href="/auth/reset-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Oublié ?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="current-password"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

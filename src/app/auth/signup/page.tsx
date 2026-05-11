"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Utensils, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setStep("verify");
    setLoading(false);
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Vérifiez votre email</h2>
          <p className="text-muted-foreground text-sm mb-1">
            Un lien de confirmation a été envoyé à
          </p>
          <p className="font-semibold text-foreground text-sm mb-6">{email}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Pensez à vérifier vos spams si vous ne le voyez pas.
          </p>
          <Link
            href="/auth/login"
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Retour à la connexion →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/8 via-background to-primary/4 items-center justify-center border-r border-border relative overflow-hidden">
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl mb-6">
            <Utensils className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">RestoOS</h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-xs mx-auto">
            La plateforme tout-en-un pour gérer votre restaurant avec l'IA.
          </p>

          <div className="mt-10 space-y-3 text-left max-w-xs mx-auto">
            {[
              { emoji: "✓", text: "14 jours d'essai gratuit" },
              { emoji: "✓", text: "Sans carte bancaire" },
              { emoji: "✓", text: "Configuration en 2 minutes" },
              { emoji: "✓", text: "Annulation à tout moment" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="h-5 w-5 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex-shrink-0">
                  {item.emoji}
                </span>
                <span className="text-sm text-foreground">{item.text}</span>
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Créer un compte</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              14 jours gratuits · Aucune carte requise
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                className="input"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email professionnel
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
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="input pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-destructive mt-1.5">
                  {8 - password.length} caractère{8 - password.length > 1 ? "s" : ""} manquant{8 - password.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Création…" : "Démarrer l'essai gratuit"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Se connecter
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/legal/terms" className="hover:underline">CGU</Link>
            {" "}et notre{" "}
            <Link href="/legal/privacy" className="hover:underline">politique de confidentialité</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

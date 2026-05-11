"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Utensils, MapPin, Phone, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  userName: string;
}

const CUISINE_TYPES = [
  { label: "Française", emoji: "🥐" },
  { label: "Italienne", emoji: "🍕" },
  { label: "Japonaise", emoji: "🍣" },
  { label: "Asiatique", emoji: "🥢" },
  { label: "Méditerranéenne", emoji: "🫒" },
  { label: "Mexicaine", emoji: "🌮" },
  { label: "Américaine", emoji: "🍔" },
  { label: "Indienne", emoji: "🍛" },
  { label: "Libanaise", emoji: "🧆" },
  { label: "Autre", emoji: "🍽️" },
];

const STEPS = [
  { num: 1, label: "Votre restaurant", icon: Utensils },
  { num: 2, label: "Localisation", icon: MapPin },
  { num: 3, label: "Contact", icon: Phone },
];

export function OnboardingWizard({ userId, userEmail, userName }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    restaurantName: "",
    cuisineType: "",
    address: "",
    city: "",
    phone: "",
    email: userEmail,
    timezone: "Europe/Paris",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.restaurantName.trim()) {
      toast.error("Le nom du restaurant est requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");
      setDone(true);
      setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 2200);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Une erreur est survenue");
      setLoading(false);
    }
  }

  // Écran de succès
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/10 mb-6 border border-emerald-500/20">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            {form.restaurantName} est prêt ! 🎉
          </h2>
          <p className="text-muted-foreground text-sm">
            Votre espace RestoOS est configuré. Redirection…
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-1 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[shimmer_2s_ease-in-out_forwards]" style={{ width: "100%", animation: "none", background: "hsl(var(--primary))", transition: "width 2s linear", }}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary/8 via-background to-primary/4 border-r border-border flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Utensils className="h-4 w-4" />
          </div>
          <span className="font-bold text-foreground">RestoOS</span>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">Configuration</p>
          <div className="space-y-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.num === step;
              const isDone = s.num < step;
              return (
                <div key={s.num} className={cn(
                  "flex items-center gap-3 rounded-2xl p-3 transition-all",
                  isActive ? "bg-primary/8 border border-primary/15" : "opacity-50"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold",
                    isDone ? "bg-emerald-500/10 text-emerald-600" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Étape {s.num}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Vos données sont sécurisées et ne sont jamais revendues.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Utensils className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">RestoOS</span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((s) => (
              <div key={s.num} className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                s.num <= step ? "bg-primary" : "bg-border"
              )} />
            ))}
          </div>

          {/* ─── STEP 1 — Nom + cuisine ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {userName ? `Bonjour ${userName.split(" ")[0]} 👋` : "Bienvenue sur RestoOS 👋"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Commençons par les informations essentielles.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Nom de votre restaurant <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.restaurantName}
                  onChange={(e) => update("restaurantName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && form.restaurantName.trim() && setStep(2)}
                  placeholder="Le Petit Bistrot"
                  autoFocus
                  className="input"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Type de cuisine
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CUISINE_TYPES.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => update("cuisineType", c.label)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left",
                        form.cuisineType === c.label
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground hover:border-muted-foreground/30 hover:bg-accent"
                      )}
                    >
                      <span className="text-base">{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => form.restaurantName.trim() && setStep(2)}
                disabled={!form.restaurantName.trim()}
                className="btn-primary w-full py-3"
              >
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── STEP 2 — Adresse ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Où se situe votre restaurant ?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Utilisée pour votre fiche Google Business.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Adresse</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="12 rue de la Paix"
                    autoFocus
                    className="input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setStep(3)}
                    placeholder="Paris"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3">
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3 — Contact ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Coordonnées du restaurant</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Pour les confirmations et rappels automatiques.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="01 23 45 67 89"
                    autoFocus
                    className="input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Email du restaurant</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contact@monrestaurant.fr"
                    className="input"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-xs text-muted-foreground">
                ✓ Vous pouvez modifier ces informations à tout moment dans les Paramètres.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1 py-3"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Création…" : "Lancer RestoOS 🚀"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

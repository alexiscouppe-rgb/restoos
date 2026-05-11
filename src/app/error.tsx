"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {error.message || "Quelque chose s'est mal passé. Notre équipe a été notifiée."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

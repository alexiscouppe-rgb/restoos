"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Erreur de chargement</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {error.message || "Une erreur est survenue lors du chargement de cette page."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

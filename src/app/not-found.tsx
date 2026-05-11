import Link from "next/link";
import { ArrowLeft, Frown } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
          <Frown className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}

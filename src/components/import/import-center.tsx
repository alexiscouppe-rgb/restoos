"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, Users, Calendar, Star, CheckCircle2,
  AlertCircle, FileText, X, Loader2, Info,
} from "lucide-react";

interface ImportCenterProps {
  restaurantId: string;
}

type Tab = "contacts" | "reservations" | "reviews";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const TABS: { key: Tab; label: string; icon: typeof Users; color: string }[] = [
  { key: "contacts", label: "Contacts clients", icon: Users, color: "text-blue-500" },
  { key: "reservations", label: "Réservations", icon: Calendar, color: "text-violet-500" },
  { key: "reviews", label: "Avis", icon: Star, color: "text-amber-500" },
];

const FORMATS: Record<Tab, { columns: string[]; example: string }> = {
  contacts: {
    columns: ["first_name", "last_name", "email", "phone", "vip", "tags", "notes"],
    example: `first_name,last_name,email,phone,vip,tags,notes
Marie,Dupont,marie@email.fr,0612345678,true,"vip,régulier","Aime la table du fond"
Jean,Martin,jean@email.fr,0698765432,false,"",""`,
  },
  reservations: {
    columns: ["date", "time", "party_size", "first_name", "last_name", "email", "phone", "notes", "status"],
    example: `date,time,party_size,first_name,last_name,email,phone,notes,status
2024-01-15,19:30,4,Marie,Dupont,marie@email.fr,0612345678,"Anniversaire",completed
2024-01-16,20:00,2,Jean,Martin,jean@email.fr,0698765432,"",confirmed`,
  },
  reviews: {
    columns: ["platform", "author_name", "rating", "comment", "created_at"],
    example: `platform,author_name,rating,comment,created_at
google,Marie Dupont,5,"Excellent restaurant, service impeccable",2024-01-15
tripadvisor,Jean Martin,4,"Très bonne cuisine, je recommande",2024-01-10
thefork,Sophie Bernard,5,"Parfait pour un repas en famille",2024-01-05`,
  },
};

export function ImportCenter({ restaurantId }: ImportCenterProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setPreview([]);
    setResult(null);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    resetState();
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      toast.error("Fichier CSV uniquement (.csv)");
      return;
    }
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.trim().split("\n").filter(Boolean);
      const parsed = lines.slice(0, 6).map(parseCSVLine); // header + 5 lignes preview
      setPreview(parsed);
    };
    reader.readAsText(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("restaurantId", restaurantId);

    try {
      const res = await fetch(`/api/import/${activeTab}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur import");
      setResult(data);
      toast.success(`${data.imported} ${activeTab === "contacts" ? "contacts" : activeTab === "reservations" ? "réservations" : "avis"} importés`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const format = FORMATS[activeTab];
  const headers = preview[0] ?? [];
  const rows = preview.slice(1);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Import de données</h1>
        <p className="text-muted-foreground mt-1">
          Importez vos données existantes depuis n'importe quelle source via CSV.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 bg-muted rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? tab.color : ""}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        {/* Format attendu */}
        <div className="rounded-2xl border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Format CSV attendu</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {format.columns.map((col) => (
              <span
                key={col}
                className="rounded-lg bg-background border border-border px-2.5 py-1 text-xs font-mono text-muted-foreground"
              >
                {col}
              </span>
            ))}
          </div>
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Voir un exemple
            </summary>
            <pre className="mt-2 text-xs bg-background rounded-xl border border-border p-3 overflow-x-auto text-muted-foreground">
              {format.example}
            </pre>
          </details>
        </div>

        {/* Zone upload */}
        {!file ? (
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Glissez votre fichier CSV ici</p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            {/* File info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {preview.length > 0 ? preview.length - 1 : 0} lignes détectées
                  </p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview table */}
            {preview.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[160px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 5 && (
                  <div className="px-3 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
                    Aperçu limité à 5 lignes — le fichier complet sera importé
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-xl p-4 mb-4 flex items-start gap-3 ${
                result.errors.length > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
              }`}>
                {result.errors.length > 0
                  ? <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  : <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-medium">
                    {result.imported} importés · {result.skipped} ignorés
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {result.errors.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Import button */}
            {!result && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Import en cours…" : `Importer ${activeTab === "contacts" ? "les contacts" : activeTab === "reservations" ? "les réservations" : "les avis"}`}
              </button>
            )}
            {result && (
              <button
                onClick={resetState}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                Importer un autre fichier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

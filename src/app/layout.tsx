import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "RestoOS — L'OS du restaurateur",
    template: "%s | RestoOS",
  },
  description:
    "Centralisez vos réservations, messages et avis. Laissez l'IA répondre à votre place.",
  keywords: ["restaurant", "réservations", "SaaS", "IA", "gestion"],
  authors: [{ name: "RestoOS" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

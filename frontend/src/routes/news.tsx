import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { Newspaper, TrendingUp, AlertCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Noutăți civice — eCetățean" },
      { name: "description", content: "Ultimele anunțuri, schimbări legislative și informații utile pentru cetățeni." },
      { property: "og:title", content: "Noutăți civice — eCetățean" },
      { property: "og:description", content: "Ultimele anunțuri, schimbări legislative și informații utile pentru cetățeni." },
    ],
  }),
  component: NewsPage,
});

type Category = "Legislativ" | "Anunț" | "Termen-limită" | "Local";

const NEWS: {
  id: number;
  category: Category;
  title: string;
  excerpt: string;
  date: string;
  source: string;
  icon: typeof Newspaper;
}[] = [
  {
    id: 1,
    category: "Legislativ",
    title: "Noi reguli pentru reînnoirea buletinului electronic",
    excerpt:
      "Începând cu 1 iunie 2026, cetățenii pot prelungi cartea de identitate complet online prin platforma ghiseul.ro, fără programare la sediu.",
    date: "20 Mai 2026",
    source: "Ministerul Afacerilor Interne",
    icon: AlertCircle,
  },
  {
    id: 2,
    category: "Termen-limită",
    title: "Declarația unică — termen final 27 mai",
    excerpt:
      "Persoanele fizice cu venituri din activități independente trebuie să depună Declarația Unică până miercuri. Penalități pentru întârziere.",
    date: "18 Mai 2026",
    source: "ANAF",
    icon: Calendar,
  },
  {
    id: 3,
    category: "Local",
    title: "Cluj-Napoca: program prelungit la Direcția de Evidență",
    excerpt:
      "În perioada 20–31 mai, programul cu publicul este extins până la ora 20:00 pentru a reduce timpii de așteptare.",
    date: "17 Mai 2026",
    source: "Primăria Cluj-Napoca",
    icon: TrendingUp,
  },
  {
    id: 4,
    category: "Anunț",
    title: "Plată impozit auto cu reducere 10% până pe 31 martie",
    excerpt:
      "Reducerea se aplică automat pentru plățile efectuate integral, online sau la ghișeu, până la finalul lunii martie.",
    date: "12 Mai 2026",
    source: "Direcția Taxe și Impozite",
    icon: Newspaper,
  },
  {
    id: 5,
    category: "Legislativ",
    title: "Modificări la Codul Rutier — sancțiuni pentru folosirea telefonului",
    excerpt:
      "Amenzile pentru utilizarea telefonului mobil la volan cresc, iar punctele de penalizare se dublează începând cu 1 iulie.",
    date: "08 Mai 2026",
    source: "Monitorul Oficial",
    icon: AlertCircle,
  },
];

const categoryStyles: Record<Category, string> = {
  Legislativ: "bg-primary-light text-primary",
  Anunț: "bg-surface-secondary text-text-secondary",
  "Termen-limită": "bg-error-light text-error",
  Local: "bg-accent-light text-accent-dark",
};

function NewsPage() {
  const [featured, ...rest] = NEWS;
  return (
    <div className="min-h-dvh bg-background pb-20 lg:flex lg:pb-0">
      <DesktopSidebar />
      <div className="lg:flex-1 lg:flex lg:flex-col lg:overflow-y-auto lg:h-dvh min-w-0">
      <TopBar />
      <main className="max-w-2xl mx-auto px-5 pt-4 lg:pt-6 lg:pb-8">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Buletin civic
          </p>
          <h1 className="font-display text-[28px] font-semibold text-foreground leading-tight mt-1">
            Noutăți
          </h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Anunțuri, schimbări legislative și termene importante.
          </p>
        </header>

        <article className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card mb-5">
          <div className="h-32 bg-gradient-to-br from-primary to-primary/80 relative">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
            <span className={`absolute top-3 left-3 inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryStyles[featured.category]}`}>
              {featured.category}
            </span>
          </div>
          <div className="p-5">
            <h2 className="font-display text-[19px] font-semibold text-foreground leading-snug">
              {featured.title}
            </h2>
            <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
              {featured.excerpt}
            </p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-[12px] text-text-tertiary">{featured.source}</span>
              <span className="text-[12px] text-text-tertiary">{featured.date}</span>
            </div>
          </div>
        </article>

        <div className="space-y-3">
          {rest.map((n) => {
            const Icon = n.icon;
            return (
              <article
                key={n.id}
                className="bg-surface border border-border rounded-xl p-4 shadow-card press hover:border-primary/30 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center text-primary">
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryStyles[n.category]}`}>
                        {n.category}
                      </span>
                      <span className="text-[11px] text-text-tertiary">{n.date}</span>
                    </div>
                    <h3 className="font-display text-[15px] font-semibold text-foreground leading-snug">
                      {n.title}
                    </h3>
                    <p className="text-[13px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                      {n.excerpt}
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-2">{n.source}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <BottomNav />
      </div>
    </div>
  );
}

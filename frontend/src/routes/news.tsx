import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion-primitives";
import { Newspaper, Loader2 } from "lucide-react";
import { useNews } from "@/lib/api-hooks";
import { formatRoDate } from "@/lib/profile-utils";

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

function newsDate(item: { published_at: string | null; created_at: string }) {
  return formatRoDate(item.published_at ?? item.created_at) ?? "";
}

function NewsPage() {
  const { data: items = [], isLoading, isError } = useNews();
  const [featured, ...rest] = items;

  return (
    <AppShell
      topBar={
        <div className="hidden lg:block">
          <TopBar title="Noutăți" subtitle="Buletin civic" />
        </div>
      }
      contentClassName="lg:max-w-2xl lg:mx-auto"
      className="lg:!px-5"
    >
      <FadeIn>
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
      </FadeIn>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Loader2 size={28} className="animate-spin mb-3" />
          <p className="text-sm">Se încarcă știrile...</p>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-text-secondary">Nu am putut încărca știrile. Verifică conexiunea la server.</p>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <FadeIn>
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto mb-4">
              <Newspaper size={26} />
            </div>
            <p className="font-display font-semibold text-[16px] text-text-primary">Nu există știri noi</p>
            <p className="text-[13px] text-text-secondary mt-1">
              Revino mai târziu pentru anunțuri și actualizări civice.
            </p>
          </div>
        </FadeIn>
      )}

      {!isLoading && !isError && featured && (
        <>
          <FadeIn>
            <motion.article
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card mb-5 lg:hover:shadow-elevated"
            >
              <div className="h-32 bg-gradient-to-br from-primary to-primary/80 relative">
                <motion.div
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]"
                />
                <span className="absolute top-3 left-3 inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-light text-primary">
                  Actualitate
                </span>
              </div>
              <div className="p-5">
                <h2 className="font-display text-[19px] font-semibold text-foreground leading-snug">
                  {featured.title}
                </h2>
                <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
                  {featured.summary}
                </p>
                <div className="flex items-center justify-end mt-4 pt-4 border-t border-border">
                  <span className="text-[12px] text-text-tertiary">{newsDate(featured)}</span>
                </div>
              </div>
            </motion.article>
          </FadeIn>

          <StaggerList className="space-y-3 pb-4">
            {rest.map((n) => (
              <StaggerItem key={n.id}>
                <article className="bg-surface border border-border rounded-2xl p-4 shadow-card transition-all duration-200 lg:hover:shadow-elevated lg:hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-11 h-11 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
                      <Newspaper size={18} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-text-tertiary">{newsDate(n)}</span>
                      <h3 className="font-display text-[15px] font-semibold text-foreground leading-snug mt-1">
                        {n.title}
                      </h3>
                      <p className="text-[13px] text-text-secondary mt-1 leading-relaxed line-clamp-3">
                        {n.summary}
                      </p>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerList>
        </>
      )}
    </AppShell>
  );
}

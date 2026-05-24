import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkles, Trash2, Newspaper, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { AdminProtected } from "@/lib/auth-guard";
import { Card, PrimaryButton, GhostButton, Field, Textarea } from "@/components/ui-bits";
import { useNews, useCreateNews, useGenerateNews, useDeleteNews } from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";
import { formatRoDate } from "@/lib/profile-utils";

export const Route = createFileRoute("/admin/news")({
  head: () => ({ meta: [{ title: "Administrare știri — eCetățean" }] }),
  component: () => (
    <AdminProtected>
      <AdminNewsPage />
    </AdminProtected>
  ),
});

function AdminNewsPage() {
  const { show } = useToast();
  const { data: items = [], isLoading, refetch } = useNews();
  const createNews = useCreateNews();
  const generateNews = useGenerateNews();
  const deleteNews = useDeleteNews();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [aiTopic, setAiTopic] = useState("Termene fiscale și servicii publice în Cluj-Napoca");

  const publish = async () => {
    if (!title.trim() || !summary.trim()) {
      show("error", "Titlul și rezumatul sunt obligatorii");
      return;
    }
    try {
      await createNews.mutateAsync({
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim() || undefined,
        publish: true,
      });
      setTitle("");
      setSummary("");
      setBody("");
      show("success", "Știre publicată în Noutăți");
      void refetch();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Eroare la publicare");
    }
  };

  const generateWithAi = async () => {
    try {
      const article = await generateNews.mutateAsync({
        topic: aiTopic.trim() || undefined,
        publish: true,
      });
      setTitle(article.title);
      setSummary(article.summary);
      setBody(article.body ?? "");
      show("success", "Știre generată și publicată cu AI");
      void refetch();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Eroare la generare AI");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteNews.mutateAsync(id);
      show("success", "Știre ștearsă");
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Eroare la ștergere");
    }
  };

  return (
    <AppShell
      hideNav
      topBar={
        <TopBar
          title="Administrare știri"
          subtitle="Publică în secțiunea Noutăți"
          showBack
          left={
            <Link to="/chat" className="press p-2 -ml-2 rounded-xl text-text-secondary" aria-label="Înapoi">
              <ArrowLeft size={20} />
            </Link>
          }
        />
      }
      contentClassName="lg:max-w-4xl lg:mx-auto"
    >
      <div className="space-y-6 pb-8">
        <Card accent="navy">
          <p className="font-display font-semibold text-[15px] text-text-primary mb-1">
            Cum adaugi știri
          </p>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Completează formularul de mai jos sau apasă „Generează cu AI” — ClaudIA creează titlu și rezumat
            (folosește cheia Gemini din backend). Știrile apar imediat la{" "}
            <Link to="/news" className="text-accent font-semibold">
              Noutăți
            </Link>
            .
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="font-display font-semibold text-[17px] text-text-primary">Adaugă manual</h2>
          <Field label="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Field label="Rezumat" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <Textarea
            label="Detalii (opțional)"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <PrimaryButton onClick={() => void publish()} disabled={createNews.isPending}>
            {createNews.isPending ? "Se publică..." : "Publică știrea"}
          </PrimaryButton>
        </section>

        <section className="space-y-3 pt-4 border-t border-border">
          <h2 className="font-display font-semibold text-[17px] text-text-primary flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            Generează cu AI
          </h2>
          <Field
            label="Subiect pentru AI"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            hint="Ex: program prelungit la ghișee, termen declarație unică"
          />
          <GhostButton onClick={() => void generateWithAi()} disabled={generateNews.isPending}>
            {generateNews.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin inline mr-2" />
                Se generează...
              </>
            ) : (
              "Generează și publică automat"
            )}
          </GhostButton>
        </section>

        <section className="space-y-3 pt-4 border-t border-border">
          <h2 className="font-display font-semibold text-[17px] text-text-primary">
            Știri existente ({items.length})
          </h2>
          {isLoading && (
            <p className="text-sm text-text-tertiary flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Se încarcă...
            </p>
          )}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-text-secondary">Nicio știre în baza de date.</p>
          )}
          <div className="space-y-2">
            {items.map((n) => (
              <Card key={n.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <Newspaper size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-[14px] text-text-primary">{n.title}</p>
                    <p className="text-[12px] text-text-tertiary mt-0.5">
                      {newsDate(n.published_at ?? n.created_at)}
                    </p>
                    <p className="text-[13px] text-text-secondary mt-1 line-clamp-2">{n.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(n.id)}
                    disabled={deleteNews.isPending}
                    className="press p-2 rounded-lg text-error hover:bg-error-light shrink-0"
                    aria-label="Șterge știrea"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function newsDate(iso: string) {
  return formatRoDate(iso) ?? "";
}

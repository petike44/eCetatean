import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, MapPin, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton, GhostButton, Field, Textarea, Card } from "@/components/ui-bits";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Sesizare nouă — eCetățean" }] }),
  component: ReportPage,
});

const CATEGORIES = ["Carosabil", "Iluminat", "Spații verzi", "Gunoi", "Alt motiv"];

function ReportPage() {
  const nav = useNavigate();
  const [cat, setCat] = useState("Carosabil");
  const [photo, setPhoto] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <AppShell topBar={<TopBar title="Sesizare trimisă" />}>
        <div className="px-5 pt-8">
          <div className="flex flex-col items-center text-center mb-6 anim-fade-up">
            <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mb-4">
              <Check size={44} className="text-success" strokeWidth={3} />
            </div>
            <h2 className="font-display font-bold text-[20px] text-text-primary">Sesizare înregistrată</h2>
          </div>
          <Card accent="green">
            <p className="text-[12px] text-text-tertiary font-medium uppercase tracking-wide">Număr de referință</p>
            <p className="font-display font-bold text-[20px] text-text-primary mt-1">#CLJ-2026-7285</p>
            <p className="text-[13.5px] text-text-secondary mt-3">
              Vei fi notificat când statusul se schimbă. Estimat: răspuns în 5 zile lucrătoare.
            </p>
          </Card>
          <div className="mt-6 space-y-2">
            <PrimaryButton onClick={() => nav({ to: "/documents" })}>Urmărește sesizarea</PrimaryButton>
            <GhostButton onClick={() => nav({ to: "/documents" })}>Înapoi la tablou</GhostButton>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell topBar={<TopBar showBack title="Sesizare nouă" />}>
      <div className="px-5 pt-4 space-y-5">
        <div>
          <p className="text-[13px] font-medium text-text-secondary mb-2">Categorie</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`press shrink-0 px-4 py-2 rounded-full font-medium text-[13px] border ${
                  cat === c ? "bg-accent-light text-accent-dark border-accent-light" : "bg-surface-secondary text-text-secondary border-transparent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Field label="Titlu sesizare" placeholder="Ex: Groapă mare pe stradă" validator={(v) => v.length < 4 ? "Minim 4 caractere" : null} />

        <Textarea label="Descriere" rows={4} placeholder="Descrie pe scurt problema..." />

        <div>
          <p className="block text-[13px] font-medium text-text-secondary mb-1.5">Locație</p>
          <div className="bg-primary-light rounded-xl p-4 flex items-center gap-3 border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-[14px] text-text-primary">Str. Horea</p>
              <p className="text-[12.5px] text-text-tertiary">Cluj-Napoca, jud. Cluj</p>
            </div>
            <button className="press text-[12.5px] text-primary font-semibold">Schimbă</button>
          </div>
        </div>

        <div>
          <p className="block text-[13px] font-medium text-text-secondary mb-1.5">Fotografie</p>
          <button
            onClick={() => setPhoto(true)}
            className="press w-full aspect-[16/10] rounded-2xl border-2 border-dashed border-border bg-surface-secondary flex flex-col items-center justify-center gap-2 text-text-tertiary overflow-hidden"
          >
            {photo ? (
              <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400 flex items-center justify-center text-stone-600 text-xs font-medium">
                Fotografie încărcată ✓
              </div>
            ) : (
              <>
                <Camera size={28} />
                <span className="text-[13.5px] font-medium text-text-secondary">Adaugă fotografie</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-2">
          <PrimaryButton onClick={() => setSubmitted(true)}>Trimite sesizarea</PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}

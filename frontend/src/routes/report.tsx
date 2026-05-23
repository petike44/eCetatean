import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton, GhostButton, Field, Textarea, Card } from "@/components/ui-bits";
import { useToast } from "@/components/Toast";
import { Protected } from "@/lib/auth-guard";
import { useSubmitReport, type ReportCategory } from "@/lib/api-hooks";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Sesizare nouă — eCetățean" }] }),
  component: () => (
    <Protected>
      <ReportPage />
    </Protected>
  ),
});

const CATEGORIES: { label: string; value: ReportCategory }[] = [
  { label: "Carosabil", value: "groapa_asfalt" },
  { label: "Iluminat", value: "iluminat_defect" },
  { label: "Gunoi", value: "gunoi_ilegal" },
  { label: "Mașină abandonată", value: "masina_abandonata" },
  { label: "Trotuar", value: "trotuar_deteriorat" },
  { label: "Alt motiv", value: "alt_problema" },
];

function ReportPage() {
  const nav = useNavigate();
  const { show } = useToast();
  const submit = useSubmitReport();
  const [cat, setCat] = useState<ReportCategory>("groapa_asfalt");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("Str. Horea, Cluj-Napoca");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  };

  const onSubmit = async () => {
    if (title.trim().length < 4) {
      show("error", "Titlul trebuie să aibă minim 4 caractere");
      return;
    }
    try {
      const result = await submit.mutateAsync({
        category: cat,
        description: [title.trim(), description.trim()].filter(Boolean).join(" — "),
        latitude: coords?.lat,
        longitude: coords?.lng,
        address,
        photo: photo ?? undefined,
      });
      setSubmittedRef(result.reference_number);
      show("success", `Sesizare înregistrată: ${result.reference_number}`);
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Eroare la trimitere");
    }
  };

  if (submittedRef) {
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
            <p className="font-display font-bold text-[20px] text-text-primary mt-1">{submittedRef}</p>
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
                key={c.value}
                onClick={() => setCat(c.value)}
                className={`press shrink-0 px-4 py-2 rounded-full font-medium text-[13px] border ${
                  cat === c.value ? "bg-accent-light text-accent-dark border-accent-light" : "bg-surface-secondary text-text-secondary border-transparent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Titlu sesizare"
          placeholder="Ex: Groapă mare pe stradă"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          validator={(v) => (v.length < 4 ? "Minim 4 caractere" : null)}
        />

        <Textarea
          label="Descriere"
          rows={4}
          placeholder="Descrie pe scurt problema..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <p className="block text-[13px] font-medium text-text-secondary mb-1.5">Locație</p>
          <div className="bg-primary-light rounded-xl p-4 flex items-center gap-3 border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-display font-semibold text-[14px] text-text-primary bg-transparent w-full outline-none"
              />
              <p className="text-[12.5px] text-text-tertiary">
                {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "GPS indisponibil"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="block text-[13px] font-medium text-text-secondary mb-1.5">Fotografie</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoChange}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="press w-full aspect-[16/10] rounded-2xl border-2 border-dashed border-border bg-surface-secondary flex flex-col items-center justify-center gap-2 text-text-tertiary overflow-hidden"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Previzualizare" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera size={28} />
                <span className="text-[13.5px] font-medium text-text-secondary">Adaugă fotografie</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-2">
          <PrimaryButton onClick={onSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Se trimite..." : "Trimite sesizarea"}
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}

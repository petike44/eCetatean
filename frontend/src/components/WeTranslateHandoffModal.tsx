import { useEffect, useState } from "react";
import { AlertCircle, Check, ExternalLink, FileText, Upload, X } from "lucide-react";
import {
  useCreateWeTranslateQuote,
  useLibreTranslateDemo,
  useVehicles,
  type LifeEventStep,
  type LibreTranslateDemoResult,
  type TranslationPackage,
} from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";

type TranslationAction = NonNullable<LifeEventStep["online_action"]>;

type Props = {
  open: boolean;
  action: TranslationAction | null;
  selectedVehicleId?: string | null;
  onClose: () => void;
};

const REQUIRED_DOCS = [
  "Brief mare / Teil II / Fahrzeugbrief",
  "Factura de cumpărare sau Kaufvertrag",
];
const MAX_FILE_COUNT = 30;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const DEMO_TEXT =
  "Zulassungsbescheinigung Teil II und Kaufvertrag fur Fahrzeugimport. " +
  "Kaufer beantragt eine autorisierte Ubersetzung fur die Zulassung in Rumanien.";

export function WeTranslateHandoffModal({
  open,
  action,
  selectedVehicleId,
  onClose,
}: Props) {
  const { show } = useToast();
  const { data: vehicles } = useVehicles();
  const createQuote = useCreateWeTranslateQuote();
  const libreTranslate = useLibreTranslateDemo();
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(selectedVehicleId ?? null);
  const [packageName, setPackageName] = useState<TranslationPackage>("Optimal");
  const [demoText, setDemoText] = useState(DEMO_TEXT);
  const [demoTarget, setDemoTarget] = useState("ro");
  const [translationResult, setTranslationResult] = useState<LibreTranslateDemoResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setVehicleId(selectedVehicleId ?? vehicles?.[0]?.id ?? null);
    setPackageName(action?.package ?? "Optimal");
    setTranslationResult(null);
  }, [action?.package, open, selectedVehicleId, vehicles]);

  if (!open || !action) return null;

  const sourceLanguage = action.source_language ?? "Germană";
  const targetLanguage = action.target_language ?? "Română";
  const hasFiles = files.length > 0;
  const totalFileBytes = files.reduce((sum, file) => sum + file.size, 0);

  const runDemoTranslation = async () => {
    try {
      const result = await libreTranslate.mutateAsync({
        q: demoText,
        source: "auto",
        target: demoTarget,
        format: "text",
        alternatives: 3,
      });
      setTranslationResult(result);
      show(
        "success",
        result.mode === "libretranslate_api"
          ? "Traducerea demo a fost generată prin LibreTranslate"
          : "Traducerea demo a folosit fallback-ul local",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare la traducerea demo";
      show("error", message);
    }
  };

  const submit = async () => {
    if (!consent) {
      show("error", "Confirmă partajarea datelor cu WeTranslate");
      return;
    }
    if (!hasFiles) {
      show("error", "Atașează documentele care trebuie traduse");
      return;
    }
    if (files.length > MAX_FILE_COUNT || totalFileBytes > MAX_TOTAL_BYTES) {
      show("error", "WeTranslate acceptă maximum 30 fișiere și 30MB în total");
      return;
    }

    try {
      const handoff = await createQuote.mutateAsync({
        files,
        sourceLanguage,
        targetLanguage,
        packageName,
        vehicleId,
        consent,
      });
      window.open(handoff.redirect_url, "_blank", "noopener,noreferrer");
      if (handoff.mode === "partner_api") {
        show("success", "Cererea WeTranslate a fost pregătită");
      } else {
        show("success", "Am deschis formularul WeTranslate cu datele pregătite");
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare la pregătirea cererii";
      show("error", message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <p className="font-display font-bold text-[17px] text-[#0F172A]">
              Traducere autorizată online
            </p>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              Pregătim cererea pentru WeTranslate cu datele din profil.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press p-2 rounded-xl border border-[#E2E8F0] text-[#64748B]"
            aria-label="Închide"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1D4ED8]">
              <FileText size={14} />
              {sourceLanguage} → {targetLanguage}
            </div>
            <p className="text-[12px] text-[#475569] mt-1">
              Serviciu: traducere autorizată, livrare prin e-mail.
            </p>
          </div>

          <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 space-y-3">
            <div>
              <p className="text-[12px] font-semibold text-[#166534]">
                Demo API LibreTranslate
              </p>
              <p className="text-[11.5px] leading-relaxed text-[#166534]/80 mt-1">
                Pentru demo, traducem text pre-completat prin API open-source. Nu înlocuiește traducerea autorizată.
              </p>
            </div>
            <textarea
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#86EFAC] bg-white px-3 py-2 text-[12px] text-[#0F172A] outline-none focus:border-[#16A34A]"
            />
            <div className="flex gap-2">
              <select
                value={demoTarget}
                onChange={(e) => setDemoTarget(e.target.value)}
                className="h-10 rounded-xl border border-[#86EFAC] bg-white px-3 text-[12px] text-[#0F172A]"
              >
                <option value="ro">Română</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
              <button
                type="button"
                onClick={() => void runDemoTranslation()}
                disabled={libreTranslate.isPending || !demoText.trim()}
                className="press flex-1 rounded-xl bg-[#16A34A] px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
              >
                {libreTranslate.isPending ? "Se traduce..." : "Tradu demo cu API"}
              </button>
            </div>
            {translationResult && (
              <div className="rounded-xl bg-white border border-[#BBF7D0] px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-[#166534]">
                    Rezultat LibreTranslate
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {translationResult.mode === "libretranslate_api" ? "API" : "Fallback"}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[#334155]">
                  {translationResult.translated_text}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[#334155] mb-2">
              Documente necesare
            </p>
            <div className="space-y-1.5">
              {REQUIRED_DOCS.map((doc) => (
                <div key={doc} className="flex items-center gap-2 text-[12.5px] text-[#475569]">
                  <Check size={12} className="text-[#10B981]" />
                  {doc}
                </div>
              ))}
            </div>
          </div>

          <label className="block rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4 text-center cursor-pointer">
            <Upload size={18} className="mx-auto text-[#1F4E79]" />
            <span className="block text-[13px] font-semibold text-[#1F4E79] mt-2">
              Atașează scanuri sau poze
            </span>
            <span className="block text-[11.5px] text-[#64748B] mt-1">
              PDF, JPG sau PNG. Max. 30MB conform formularului WeTranslate.
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
                if (selected.length > MAX_FILE_COUNT || totalBytes > MAX_TOTAL_BYTES) {
                  show("error", "Selectează maximum 30 fișiere și 30MB în total");
                  e.currentTarget.value = "";
                  return;
                }
                setFiles(selected);
              }}
            />
          </label>

          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2"
                >
                  <span className="text-[12px] text-[#334155] truncate">{file.name}</span>
                  <span className="text-[11px] text-[#64748B] shrink-0">
                    {Math.ceil(file.size / 1024)} KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {vehicles && vehicles.length > 0 && (
            <div>
              <label className="text-[12px] font-semibold text-[#334155] mb-1.5 block">
                Vehicul asociat
              </label>
              <select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(e.target.value || null)}
                className="w-full h-10 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make ?? "Vehicul"} {vehicle.model ?? ""} {vehicle.vin ? `· ${vehicle.vin}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold text-[#334155] mb-1.5 block">
              Pachet traducere
            </label>
            <select
              value={packageName}
              onChange={(e) => setPackageName(e.target.value as TranslationPackage)}
              className="w-full h-10 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
            >
              <option value="Economy">Economy</option>
              <option value="Optimal">Optimal</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          <label className="flex items-start gap-2 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[12px] leading-relaxed text-[#92400E]">
              Sunt de acord ca eCetățean să transmită către WeTranslate datele de contact,
              detaliile vehiculului și documentele atașate pentru solicitarea ofertei.
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-3">
            <AlertCircle size={14} className="text-[#64748B] mt-0.5 shrink-0" />
            <p className="text-[11.5px] leading-relaxed text-[#64748B]">
              Dacă WeTranslate activează endpoint-ul de partener, te ducem direct la
              confirmare. Până atunci deschidem formularul oficial cu cererea pregătită.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={createQuote.isPending}
            className="press w-full flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] text-white py-3 text-[13.5px] font-semibold disabled:opacity-60"
          >
            {createQuote.isPending ? "Se pregătește..." : "Continuă către confirmare"}
            {!createQuote.isPending && <ExternalLink size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Languages, Upload, X } from "lucide-react";
import { useTranslateDocument, type LifeEventStep } from "@/lib/api-hooks";
import { useToast } from "@/components/Toast";

type TranslationAction = NonNullable<LifeEventStep["online_action"]>;

type Props = {
  open: boolean;
  action: TranslationAction | null;
  onClose: () => void;
};

type LanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
};

const LANGUAGES: LanguageOption[] = [
  { code: "de", label: "Germană", nativeLabel: "Deutsch" },
  { code: "en", label: "Engleză", nativeLabel: "English" },
  { code: "fr", label: "Franceză", nativeLabel: "Français" },
  { code: "es", label: "Spaniolă", nativeLabel: "Español" },
  { code: "it", label: "Italiană", nativeLabel: "Italiano" },
  { code: "nl", label: "Olandeză", nativeLabel: "Nederlands" },
  { code: "pt", label: "Portugheză", nativeLabel: "Português" },
  { code: "pl", label: "Poloneză", nativeLabel: "Polski" },
  { code: "hu", label: "Maghiară", nativeLabel: "Magyar" },
  { code: "uk", label: "Ucraineană", nativeLabel: "Українська" },
  { code: "ru", label: "Rusă", nativeLabel: "Русский" },
  { code: "tr", label: "Turcă", nativeLabel: "Türkçe" },
  { code: "bg", label: "Bulgară", nativeLabel: "Български" },
  { code: "cs", label: "Cehă", nativeLabel: "Čeština" },
  { code: "sk", label: "Slovacă", nativeLabel: "Slovenčina" },
  { code: "sv", label: "Suedeză", nativeLabel: "Svenska" },
  { code: "fi", label: "Finlandeză", nativeLabel: "Suomi" },
  { code: "el", label: "Greacă", nativeLabel: "Ελληνικά" },
  { code: "ar", label: "Arabă", nativeLabel: "العربية" },
  { code: "zh", label: "Chineză", nativeLabel: "中文" },
];

const TARGET_LANGUAGES: LanguageOption[] = [
  { code: "ro", label: "Română", nativeLabel: "Română" },
  { code: "en", label: "Engleză", nativeLabel: "English" },
  { code: "de", label: "Germană", nativeLabel: "Deutsch" },
  { code: "fr", label: "Franceză", nativeLabel: "Français" },
];

const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function sourceFromAction(action: TranslationAction | null): string {
  const value = action?.source_language?.toLowerCase() ?? "";
  if (value === "germană" || value === "germana" || value === "german" || value === "de") return "de";
  return LANGUAGES.some((language) => language.code === value) ? value : "de";
}

function downloadName(file: File | null): string {
  if (!file) return "document-tradus.pdf";
  return `translated-${file.name.replace(/\.pdf$/i, "")}.pdf`;
}

export function DocumentTranslationModal({ open, action, onClose }: Props) {
  const { show } = useToast();
  const translateDocument = useTranslateDocument();
  const [source, setSource] = useState("de");
  const [target, setTarget] = useState("ro");
  const [file, setFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource(sourceFromAction(action));
    setTarget(action?.target_language === "en" ? "en" : "ro");
    setFile(null);
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [action, open]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const selectedSource = useMemo(
    () => LANGUAGES.find((language) => language.code === source),
    [source],
  );

  if (!open || !action) return null;

  const handleTranslate = async () => {
    if (!file) {
      show("error", "Atașează un PDF pentru traducere");
      return;
    }
    if (file.size > MAX_TOTAL_BYTES) {
      show("error", "PDF-ul trebuie să aibă maximum 30MB");
      return;
    }

    try {
      const blob = await translateDocument.mutateAsync({ file, source, target });
      setDownloadUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      show("success", "Documentul tradus este gata pentru descărcare");
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Eroare la traducerea documentului");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <p className="font-display font-bold text-[17px] text-[#0F172A]">
              Tradu document PDF
            </p>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              Alegi limba, încarci PDF-ul, iar noi generăm un document tradus.
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

        <div className="px-5 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
          <section>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#334155] mb-2">
              <Languages size={14} />
              1. Alege limba documentului
            </div>
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-2">
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => setSource(language.code)}
                    className={`press rounded-xl border px-3 py-2 text-left transition-colors ${
                      source === language.code
                        ? "border-[#1F4E79] bg-[#EFF6FF] text-[#1F4E79]"
                        : "border-[#E2E8F0] bg-white text-[#334155]"
                    }`}
                  >
                    <span className="block text-[12px] font-semibold">{language.label}</span>
                    <span className="block text-[10.5px] text-[#64748B]">{language.nativeLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <label className="text-[12px] font-semibold text-[#334155] mb-1.5 block">
              Tradu în
            </label>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="w-full h-10 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
            >
              {TARGET_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="text-[12px] font-semibold text-[#334155] mb-2">
              2. Încarcă documentul PDF
            </p>
            <label className="block rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4 text-center cursor-pointer">
              <Upload size={18} className="mx-auto text-[#1F4E79]" />
              <span className="block text-[13px] font-semibold text-[#1F4E79] mt-2">
                Selectează PDF
              </span>
              <span className="block text-[11.5px] text-[#64748B] mt-1">
                PDF text-based, maximum 30MB. Scanurile vor necesita OCR într-o etapă următoare.
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  if (selected && selected.size > MAX_TOTAL_BYTES) {
                    show("error", "Selectează un PDF de maximum 30MB");
                    event.currentTarget.value = "";
                    return;
                  }
                  setDownloadUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return null;
                  });
                  setFile(selected);
                }}
              />
            </label>
            {file && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2">
                <span className="flex items-center gap-2 text-[12px] text-[#334155] truncate">
                  <FileText size={13} className="shrink-0 text-[#1F4E79]" />
                  {file.name}
                </span>
                <span className="text-[11px] text-[#64748B] shrink-0">
                  {Math.ceil(file.size / 1024)} KB
                </span>
              </div>
            )}
          </section>

          <div className="rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3">
            <p className="text-[12px] leading-relaxed text-[#1D4ED8]">
              Sursă: {selectedSource?.label ?? source} → țintă:{" "}
              {TARGET_LANGUAGES.find((language) => language.code === target)?.label ?? target}.
              Documentul generat nu este traducere autorizată.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
          <button
            type="button"
            onClick={() => void handleTranslate()}
            disabled={translateDocument.isPending || !file}
            className="press w-full flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-white py-3 text-[13.5px] font-semibold disabled:opacity-60"
          >
            {translateDocument.isPending ? "Se traduce PDF-ul..." : "Tradu documentul"}
          </button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={downloadName(file)}
              className="press w-full flex items-center justify-center gap-2 rounded-xl bg-[#1F4E79] text-white py-3 text-[13.5px] font-semibold"
            >
              <Download size={15} />
              Descarcă documentul tradus
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Download, FileText, Search, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Badge, Card, GhostButton, PrimaryButton } from "@/components/ui-bits";
import { Protected } from "@/lib/auth-guard";
import {
  type PdfAutofillField,
  type PdfForm,
  useAnalyzePdfForm,
  useFillPdfForm,
  usePdfForms,
  useSavePdfFormMapping,
  useSuggestPdfFormMapping,
} from "@/lib/api-hooks";
import { FieldRenderer } from "@/components/FieldRenderer";

type DocumentPreviewSearch = {
  form?: string;
  q?: string;
};

const DATA_KEY_OPTIONS = [
  "profile.full_name",
  "profile.cnp",
  "profile.date_of_birth",
  "profile.full_address",
  "profile.address",
  "profile.city",
  "profile.email",
  "profile.phone",
  "profile.identity_card",
  "profile.buletin_series",
  "profile.buletin_number",
  "profile.buletin_expiry",
  "system.today",
];

export const Route = createFileRoute("/document-preview")({
  validateSearch: (search: Record<string, unknown>): DocumentPreviewSearch => ({
    form: typeof search.form === "string" ? search.form : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Previzualizare cerere — eCetățean" }] }),
  component: () => (
    <Protected>
      <DocPreview />
    </Protected>
  ),
});

function DocPreview() {
  const { form: formFromUrl, q: queryFromUrl } = Route.useSearch();
  const [query, setQuery] = useState(queryFromUrl ?? "");
  const [selectedForm, setSelectedForm] = useState<PdfForm | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<PdfAutofillField[]>([]);
  const forms = usePdfForms(query);
  const analyze = useAnalyzePdfForm();
  const fill = useFillPdfForm();
  const saveMapping = useSavePdfFormMapping();
  const suggestMapping = useSuggestPdfFormMapping();

  const selectedAnalysis = analyze.data;
  const requiredCount = fields.filter((field) => field.required).length;
  const filledRequiredCount = fields.filter(
    (field) => field.required && field.value?.trim(),
  ).length;
  const missingInputs = selectedAnalysis?.missing_inputs ?? selectedForm?.required_inputs ?? [];

  const fillPayload = useMemo(() => {
    const values = { ...inputValues };
    for (const field of fields) {
      if (field.value?.trim()) values[field.id] = field.value;
    }
    return values;
  }, [fields, inputValues]);

  useEffect(() => {
    if (!selectedAnalysis) return;
    setFields(selectedAnalysis.fields);
    setInputValues((current) => {
      const next = { ...current };
      for (const input of selectedAnalysis.missing_inputs) {
        if (!(input.key in next)) next[input.key] = "";
      }
      return next;
    });
  }, [selectedAnalysis]);

  function selectForm(form: PdfForm) {
    setSelectedForm(form);
    setInputValues({});
    setFields([]);
    analyze.mutate({ formId: form.slug });
  }

  useEffect(() => {
    if (!formFromUrl || autoSelected || !forms.data?.length) return;
    const match = forms.data.find((form) => form.slug === formFromUrl);
    if (match) {
      selectForm(match);
      setAutoSelected(true);
    }
  }, [formFromUrl, forms.data, autoSelected]);

  function updateInput(key: string, value: string) {
    setInputValues((current) => ({ ...current, [key]: value }));
    setFields((current) =>
      current.map((field) => (field.dataKey === `input.${key}` ? { ...field, value } : field)),
    );
  }

  function updateField(fieldId: string, value: string) {
    setFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, value } : field)),
    );
  }

  function updateFieldDataKey(fieldId: string, dataKey: string) {
    setFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, dataKey } : field)),
    );
  }

  function rerunAnalysis() {
    if (!selectedForm) return;
    analyze.mutate({ formId: selectedForm.slug, additionalData: inputValues });
  }

  function downloadPdf() {
    if (!selectedForm) return;
    fill.mutate({
      form: selectedForm,
      additionalData: fillPayload,
      fields,
    });
  }

  function saveCorrections() {
    if (!selectedForm || fields.length === 0) return;
    saveMapping.mutate({
      form: selectedForm,
      fields: fields.map(({ value: _value, ...field }) => field),
    });
  }

  function requestSuggestions() {
    if (!selectedForm) return;
    suggestMapping.mutate(
      { form: selectedForm },
      {
        onSuccess: (data) => {
          // Merge proposals into the current field list. We DO NOT auto-save;
          // the user reviews the dropdown values then clicks "Salvează corecții".
          // Preserve any value the user already typed.
          const byName = new Map(
            data.mapping.map((m) => [m.acroFieldName ?? m.id, m] as const),
          );
          setFields((current) =>
            current.map((f) => {
              const key = f.acroFieldName ?? f.id;
              const proposal = byName.get(key);
              if (!proposal) return f;
              return {
                ...f,
                dataKey: proposal.dataKey,
                confidence: proposal.confidence,
                source: proposal.source,
              };
            }),
          );
        },
      },
    );
  }

  const isTipizatul = selectedForm?.source === "tipizatul";
  const hasUserMapping = fields.some((f) => f.source === "saved" || f.source === "ai");
  const showSuggestButton = isTipizatul && fields.length > 0;
  const suggestData = suggestMapping.data;

  return (
    <AppShell topBar={<TopBar showBack title="Previzualizare cerere" />}>
      <div className="px-5 pt-5 pb-36 lg:max-w-5xl lg:mx-auto lg:px-8">
        <header className="mb-5">
          <p className="text-[12px] uppercase tracking-wider text-text-tertiary">
            Autocompletare PDF
          </p>
          <h1 className="font-display font-bold text-[24px] text-text-primary mt-1">
            Caută și completează formulare oficiale
          </h1>
          <p className="text-[13.5px] text-text-secondary mt-2">
            Datele din profil sunt completate automat, iar câmpurile lipsă pot fi corectate înainte
            de descărcare.
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-5">
          <section className="space-y-4">
            <Card>
              <label className="block text-[13px] font-medium text-text-secondary mb-2">
                Caută formular
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ex. viza flotant, DRPCIV, certificat fiscal"
                  className="w-full bg-surface-secondary border border-transparent focus:bg-surface focus:border-primary text-[14px] text-text-primary placeholder:text-text-tertiary py-3 pl-10 pr-3 rounded-xl outline-none"
                />
              </div>
            </Card>

            <div className="space-y-3">
              {forms.isLoading && (
                <p className="text-[13px] text-text-secondary">Se încarcă formularele...</p>
              )}
              {forms.data?.map((form) => (
                <button
                  key={form.id}
                  onClick={() => selectForm(form)}
                  className={`press w-full text-left bg-surface border rounded-2xl p-4 shadow-card ${
                    selectedForm?.slug === form.slug ? "border-accent" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <FileText size={19} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display font-semibold text-[14.5px] text-text-primary">
                        {form.title}
                      </h2>
                      <p className="text-[12.5px] text-text-tertiary mt-0.5">{form.institution}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {form.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {forms.data?.length === 0 && (
                <Card accent="gray">
                  <p className="text-[13px] text-text-secondary">
                    Nu am găsit formulare pentru căutarea curentă.
                  </p>
                </Card>
              )}
            </div>
          </section>

          <section className="mt-5 lg:mt-0">
            {!selectedForm ? (
              <Card className="min-h-[320px] flex items-center justify-center text-center">
                <div>
                  <Wand2 size={34} className="mx-auto text-accent mb-3" />
                  <h2 className="font-display font-semibold text-[17px] text-text-primary">
                    Alege un formular
                  </h2>
                  <p className="text-[13px] text-text-secondary mt-1 max-w-sm">
                    Selectează un PDF din catalog pentru a vedea ce câmpuri pot fi completate
                    automat.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                        {selectedForm.institution}
                      </p>
                      <h2 className="font-display font-bold text-[19px] text-text-primary mt-1">
                        {selectedForm.title}
                      </h2>
                      {selectedForm.description && (
                        <p className="text-[13px] text-text-secondary mt-1">
                          {selectedForm.description}
                        </p>
                      )}
                    </div>
                    <Badge tone={analyze.isPending ? "amber" : "green"}>
                      {analyze.isPending
                        ? "Analiză"
                        : `${filledRequiredCount}/${requiredCount || 0}`}
                    </Badge>
                  </div>

                  {analyze.error && (
                    <div className="mt-4 rounded-xl border border-error/30 bg-error-light/50 p-3 text-[13px] text-error flex gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      Analiza formularului a eșuat. Încearcă din nou sau alege alt formular.
                    </div>
                  )}
                </Card>

                {missingInputs.length > 0 && (
                  <Card accent="amber">
                    <Section title="Date lipsă">
                      <div className="grid gap-3 md:grid-cols-2">
                        {missingInputs.map((input) => (
                          <Editable
                            key={input.key}
                            label={input.label}
                            value={inputValues[input.key] ?? ""}
                            placeholder={input.placeholder}
                            onChange={(value) => updateInput(input.key, value)}
                          />
                        ))}
                      </div>
                    </Section>
                    <GhostButton
                      className="mt-4"
                      onClick={rerunAnalysis}
                      disabled={analyze.isPending}
                    >
                      Reanalizează cu datele introduse
                    </GhostButton>
                  </Card>
                )}

                <Card>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold text-[15px] text-text-primary">
                        Previzualizare date
                      </p>
                      <p className="text-[12.5px] text-text-secondary">
                        Editează valorile detectate înainte de descărcare.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={saveCorrections}
                      disabled={fields.length === 0 || saveMapping.isPending}
                      className="press rounded-xl border border-border px-3 py-2 text-[12px] font-semibold text-text-primary disabled:opacity-50"
                    >
                      {saveMapping.isPending ? "Se salvează..." : "Salvează corecții"}
                    </button>
                  </div>
                  {saveMapping.isError && (
                    <p className="mb-3 rounded-lg bg-error-light/40 px-3 py-2 text-[12px] text-error">
                      Corecțiile nu au putut fi salvate. Verifică dacă tabela `pdf_forms` există în
                      Supabase.
                    </p>
                  )}
                  {saveMapping.isSuccess && (
                    <p className="mb-3 rounded-lg bg-success-light px-3 py-2 text-[12px] text-success">
                      Corecțiile au fost salvate pentru acest formular.
                    </p>
                  )}
                  <Section title="Câmpuri detectate">
                    {analyze.isPending && (
                      <p className="text-[13px] text-text-secondary">
                        Se detectează câmpurile PDF...
                      </p>
                    )}
                    {!analyze.isPending && fields.length === 0 && (
                      <p className="text-[13px] text-text-secondary">
                        Nu există încă o analiză pentru acest formular.
                      </p>
                    )}
                    <div className="space-y-3">
                      {fields.map((field) =>
                        isTipizatul ? (
                          <div key={field.id} className="space-y-2">
                            <FieldRenderer
                              field={field}
                              onValueChange={(value) => updateField(field.id, value)}
                            />
                            <div className="grid gap-2 md:grid-cols-[180px_1fr]">
                              <select
                                value={
                                  DATA_KEY_OPTIONS.includes(field.dataKey)
                                    ? field.dataKey
                                    : "custom"
                                }
                                onChange={(event) => {
                                  if (event.target.value !== "custom")
                                    updateFieldDataKey(field.id, event.target.value);
                                }}
                                className="rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[12px] text-text-secondary outline-none focus:border-primary"
                              >
                                <option value="custom">Cheie personalizată</option>
                                {DATA_KEY_OPTIONS.map((key) => (
                                  <option key={key} value={key}>
                                    {key}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={field.dataKey}
                                onChange={(event) =>
                                  updateFieldDataKey(field.id, event.target.value)
                                }
                                placeholder="ex. profile.full_name sau input.vehicle_make"
                                className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[12px] text-text-secondary outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        ) : (
                        <div
                          key={field.id}
                          className="rounded-xl border border-border bg-surface-secondary/60 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[12px] font-semibold text-text-primary">
                                {field.label}
                              </p>
                              <p className="text-[11px] text-text-tertiary">
                                {field.source} · {Math.round(field.confidence * 100)}% încredere
                              </p>
                            </div>
                            {field.required && (
                              <Badge tone={field.value?.trim() ? "green" : "amber"}>
                                Obligatoriu
                              </Badge>
                            )}
                          </div>
                          <input
                            value={field.value ?? ""}
                            onChange={(event) => updateField(field.id, event.target.value)}
                            placeholder="Completează valoarea"
                            className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[14px] text-text-primary outline-none focus:border-primary"
                          />
                          <div className="mt-2 grid gap-2 md:grid-cols-[180px_1fr]">
                            <select
                              value={
                                DATA_KEY_OPTIONS.includes(field.dataKey) ? field.dataKey : "custom"
                              }
                              onChange={(event) => {
                                if (event.target.value !== "custom")
                                  updateFieldDataKey(field.id, event.target.value);
                              }}
                              className="rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[12px] text-text-secondary outline-none focus:border-primary"
                            >
                              <option value="custom">Cheie personalizată</option>
                              {DATA_KEY_OPTIONS.map((key) => (
                                <option key={key} value={key}>
                                  {key}
                                </option>
                              ))}
                            </select>
                            <input
                              value={field.dataKey}
                              onChange={(event) => updateFieldDataKey(field.id, event.target.value)}
                              placeholder="ex. profile.full_name sau input.vehicle_make"
                              className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[12px] text-text-secondary outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        ))}
                    </div>
                  </Section>
                </Card>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border">
        <div className="mx-auto max-w-[440px] md:max-w-[760px] lg:max-w-4xl px-5 py-4">
          <p className="text-[12.5px] text-text-secondary mb-3 text-center">
            Câmpuri obligatorii completate:{" "}
            <span className="font-display font-semibold text-text-primary">
              {filledRequiredCount}/{requiredCount || 0}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <GhostButton onClick={rerunAnalysis} disabled={!selectedForm || analyze.isPending}>
              Analizează
            </GhostButton>
            <PrimaryButton
              onClick={downloadPdf}
              disabled={!selectedForm || fields.length === 0 || fill.isPending}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download size={16} /> {fill.isPending ? "Se generează..." : "Descarcă PDF"}
              </span>
            </PrimaryButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display font-semibold text-[12px] text-text-tertiary uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Editable({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-secondary mb-1">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary"
      />
    </div>
  );
}

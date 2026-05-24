// Renders a single PdfAutofillField as the right input widget based on
// field_type (text / checkbox / dropdown / radio). Used by the tipizatul
// preview flow so checkbox/dropdown/radio fields actually work — instead
// of falling back to a free-text input as the old flow did.
//
// Mirrors upstream tipizatul.eu's FormField.tsx factoring so renderer logic
// stays out of document-preview.tsx.

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui-bits";
import type { PdfAutofillField } from "@/lib/api-hooks";

export interface FieldRendererProps {
  field: PdfAutofillField;
  onValueChange: (value: string) => void;
}

export function FieldRenderer({ field, onValueChange }: FieldRendererProps) {
  const widget = pickWidget(field);
  return (
    <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-text-primary">{field.label}</p>
          <p className="text-[11px] text-text-tertiary">
            {field.source} · {Math.round(field.confidence * 100)}% încredere
            {field.field_type ? ` · ${field.field_type}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {field.required && (
            <Badge tone={field.value?.trim() ? "green" : "amber"}>Obligatoriu</Badge>
          )}
          {field.needs_review && (
            <Badge tone="amber">
              <span className="inline-flex items-center gap-1">
                <AlertCircle size={11} /> Verifică
              </span>
            </Badge>
          )}
        </div>
      </div>
      {widget === "text" && (
        <TextWidget value={field.value ?? ""} onChange={onValueChange} />
      )}
      {widget === "checkbox" && (
        <CheckboxWidget value={field.value ?? ""} onChange={onValueChange} />
      )}
      {widget === "dropdown" && (
        <DropdownWidget
          value={field.value ?? ""}
          options={field.options ?? []}
          onChange={onValueChange}
        />
      )}
      {widget === "radio" && (
        <RadioWidget
          name={field.id}
          value={field.value ?? ""}
          options={field.options ?? []}
          onChange={onValueChange}
        />
      )}
      {widget === "unsupported" && (
        <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-text-tertiary">
          Câmpul nu poate fi completat automat (probabil semnătură).
        </p>
      )}
    </div>
  );
}

function pickWidget(field: PdfAutofillField): "text" | "checkbox" | "dropdown" | "radio" | "unsupported" {
  if (field.field_type === "unsupported") return "unsupported";
  if (field.field_type === "checkbox") return "checkbox";
  if (field.field_type === "radio" && (field.options?.length ?? 0) > 0) return "radio";
  if (field.field_type === "dropdown" && (field.options?.length ?? 0) > 0) return "dropdown";
  return "text";
}

function TextWidget({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Completează valoarea"
      className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[14px] text-text-primary outline-none focus:border-primary"
    />
  );
}

function CheckboxWidget({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const checked = value === "true" || value === "1" || value === "on";
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked ? "true" : "false")}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      <span className="text-[13px] text-text-secondary">
        {checked ? "Bifat" : "Nebifat"}
      </span>
    </label>
  );
}

function DropdownWidget({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-transparent bg-surface px-3 py-2.5 text-[14px] text-text-primary outline-none focus:border-primary"
    >
      <option value="">— Alege —</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function RadioWidget({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="inline-flex items-center gap-1.5 cursor-pointer text-[13px]">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={(event) => onChange(event.target.value)}
            className="h-4 w-4 accent-primary"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

import { useState } from "react";
import { Calendar, CreditCard, X } from "lucide-react";

const APPOINTMENT_SLOTS = [
  "Marți 09:30",
  "Marți 14:00",
  "Miercuri 10:00",
  "Joi 11:30",
  "Vineri 09:00",
];

type PaymentModalProps = {
  open: boolean;
  amountRon: number;
  description: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function PaymentModal({
  open,
  amountRon,
  description,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const confirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#1F4E79]" />
            <h2 className="font-display font-bold text-[17px] text-[#0F172A]">Plată online</h2>
          </div>
          <button type="button" onClick={onClose} className="press p-1.5 rounded-lg text-[#94A3B8]">
            <X size={18} />
          </button>
        </div>
        <p className="text-[14px] text-[#475569] mb-1">{description}</p>
        <p className="font-display font-bold text-[28px] text-[#0F172A] mb-4">
          {amountRon.toLocaleString("ro-RO")} RON
        </p>
        <p className="text-[12px] text-[#94A3B8] mb-4">
          Simulare demo — nu se efectuează o plată reală.
        </p>
        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="press w-full bg-[#F59E0B] text-white font-semibold text-[14px] py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Se procesează..." : "Confirmă plata"}
        </button>
      </div>
    </div>
  );
}

type AppointmentModalProps = {
  open: boolean;
  office: string;
  slotHint?: string;
  onClose: () => void;
  onSuccess: (slot: string, ref: string) => void;
};

export function AppointmentModal({
  open,
  office,
  slotHint,
  onClose,
  onSuccess,
}: AppointmentModalProps) {
  const [selected, setSelected] = useState(APPOINTMENT_SLOTS[0]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const confirm = () => {
    setLoading(true);
    setTimeout(() => {
      const ref = `EC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      // Persist to localStorage so /plans Programări tab can display it
      try {
        const saved = {
          id: crypto.randomUUID(),
          reference: ref,
          office,
          slot: selected,
          savedAt: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem("ec_appointments") ?? "[]");
        localStorage.setItem("ec_appointments", JSON.stringify([saved, ...existing]));
      } catch {
        // localStorage unavailable — silently ignore
      }
      setLoading(false);
      onSuccess(selected, ref);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[#1F4E79]" />
            <h2 className="font-display font-bold text-[17px] text-[#0F172A]">Programare</h2>
          </div>
          <button type="button" onClick={onClose} className="press p-1.5 rounded-lg text-[#94A3B8]">
            <X size={18} />
          </button>
        </div>
        <p className="text-[14px] font-medium text-[#0F172A] mb-1">{office}</p>
        {slotHint && (
          <p className="text-[12px] text-[#64748B] mb-3">Recomandat: {slotHint}</p>
        )}
        <p className="text-[12px] text-[#94A3B8] mb-3">Simulare demo — alege un interval:</p>
        <div className="space-y-2 mb-4">
          {APPOINTMENT_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelected(slot)}
              className={`press w-full text-left px-4 py-2.5 rounded-xl border text-[14px] ${
                selected === slot
                  ? "border-[#1F4E79] bg-[#EFF6FF] font-semibold text-[#1F4E79]"
                  : "border-[#E2E8F0] text-[#475569]"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="press w-full bg-[#F59E0B] text-white font-semibold text-[14px] py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Se confirmă..." : "Confirmă programarea"}
        </button>
      </div>
    </div>
  );
}

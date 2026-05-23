import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, AlertCircle } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem { id: number; kind: ToastKind; msg: string }
interface ToastCtx { show: (kind: ToastKind, msg: string) => void }

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((kind: ToastKind, msg: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, kind, msg }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), kind === "success" ? 3000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed top-3 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-5 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`anim-fade-up pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-elevated text-white text-sm font-medium max-w-[400px] w-full ${
              t.kind === "success" ? "bg-success" : "bg-error"
            }`}
          >
            {t.kind === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

import { Check, Lock, Pencil } from "@/components/checkout/icons";
import type { ReactNode } from "react";

export function PixIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8l4.2 4.2-4.2 4.2L7.8 7zM12 12.8l4.2 4.2-4.2 4.2L7.8 17zM2.8 12L7 7.8l4.2 4.2L7 16.2zM12.8 12L17 7.8l4.2 4.2-4.2 4.2z" />
    </svg>
  );
}

export function CheckoutHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="overflow-hidden bg-primary py-2 text-sm font-semibold text-primary-foreground">
        <div className="co-marquee flex w-max gap-10 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex gap-10">
              <span>Frete grátis acima de R$97</span>
              <span>Use o cupom PRIMEIRA15 e ganhe 15% OFF</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/" aria-label="Voltar para a loja Patch Sleep">
          <img src="/images/logo.svg" alt="Patch Sleep" className="h-10 w-auto" width="110" height="40" />
        </a>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Lock className="size-4 text-success" aria-hidden="true" />
          <span>
            Pagamento <span className="text-foreground">100% seguro</span>
          </span>
        </div>
      </div>
    </header>
  );
}

export function CheckoutFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2">
          <span>Seus dados estão protegidos e são usados só para entregar o seu pedido.</span>
        </div>
        <nav className="flex gap-4 font-medium">
          <a className="hover:text-primary" href="/termos-e-condicoes">Termos</a>
          <a className="hover:text-primary" href="/politica-de-privacidade">Privacidade</a>
          <a className="hover:text-primary" href="/garantia">Garantia</a>
        </nav>
      </div>
    </footer>
  );
}

export type StepState = "open" | "done" | "locked";

export function StepCard({
  number,
  title,
  hint,
  state,
  summary,
  onEdit,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  state: StepState;
  summary?: ReactNode;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="co-card p-5 md:p-6" aria-labelledby={`step-${number}`} data-state={state}>
      <div className="flex items-start gap-3">
        <span className="co-step-badge" data-state={state} aria-hidden="true">
          {state === "done" ? <Check className="size-4" strokeWidth={3} /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`step-${number}`} className={`text-lg font-extrabold leading-tight ${state === "locked" ? "text-muted-foreground" : "text-primary"}`}>
              {title}
            </h2>
            {state === "done" && onEdit && (
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-strong" aria-label={`Editar ${title}`}>
                <Pencil className="size-3.5" aria-hidden="true" /> Editar
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{state === "done" ? null : hint}</p>
          {state === "done" && summary && <div className="mt-1 text-sm leading-relaxed text-foreground">{summary}</div>}
        </div>
      </div>
      {state === "open" && <div className="mt-5">{children}</div>}
    </section>
  );
}

export function Field({
  label,
  error,
  className = "",
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; name: string }) {
  const id = `co-${input.name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <input id={id} className="co-input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...input} />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

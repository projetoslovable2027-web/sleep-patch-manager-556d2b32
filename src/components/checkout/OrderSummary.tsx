import { ChevronDown, Minus, Plus, Tag, Trash2, Truck, X } from "@/components/checkout/icons";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { COUPONS, PRODUCT_NAME, formatBRL, normalizeCoupon, thumb, type CartSummary } from "@/lib/cart";

type Props = {
  summary: CartSummary;
  loading?: boolean;
  coupon: string | null;
  onQty: (id: string, qty: number) => void;
  onCoupon: (code: string | null) => void;
};

function SummaryBody({ summary: s, loading, coupon, onQty, onCoupon }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const apply = (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeCoupon(code);
    if (!c) return setError("Cupom inválido.");
    setError("");
    setCode("");
    onCoupon(c);
  };

  if (loading) return <SummarySkeleton />;

  return (
    <div>
      <ul className="divide-y divide-border">
        {s.lines.map(({ kit, qty }) => (
          <li key={kit.id} className="flex gap-3 py-4 first:pt-0">
            <div className="relative shrink-0">
              <img src={thumb(kit.image)} alt="" width="64" height="64" className="size-16 rounded-lg border border-border bg-primary-soft object-cover" />
              <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">{PRODUCT_NAME}</p>
              <p className="text-sm text-muted-foreground">
                {kit.title} · {kit.dose}
              </p>
              <div className="mt-2 inline-flex items-center rounded-lg border border-border">
                <button type="button" className="p-1.5 text-muted-foreground hover:text-primary" onClick={() => onQty(kit.id, qty - 1)} aria-label={qty === 1 ? `Remover ${kit.title}` : `Diminuir ${kit.title}`}>
                  {qty === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                </button>
                <span className="w-7 text-center text-sm font-bold" aria-live="polite">{qty}</span>
                <button type="button" disabled={kit.id === "bump-1"} className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30" onClick={() => onQty(kit.id, qty + 1)} aria-label={`Aumentar ${kit.title}`}>
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground line-through">{formatBRL(kit.oldPrice * qty)}</p>
              <p className="font-bold">{formatBRL(kit.price * qty)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        {coupon ? (
          <div className="flex items-center justify-between rounded-lg bg-success-soft px-3 py-2 text-sm">
            <span className="flex items-center gap-2 font-semibold text-success">
              <Tag className="size-4" aria-hidden="true" /> {coupon} · {Math.round((COUPONS[coupon] || 0) * 100)}% OFF
            </span>
            <button type="button" onClick={() => onCoupon(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remover cupom">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={apply} className="flex gap-2">
            <label htmlFor="co-coupon" className="sr-only">Cupom de desconto</label>
            <input id="co-coupon" className="co-input h-11 uppercase" placeholder="Cupom de desconto" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={error ? true : undefined} />
            <Button type="submit" variant="soft" className="h-11 px-5">Aplicar</Button>
          </form>
        )}
        {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
      </div>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold">{formatBRL(s.subtotal)}</dd>
        </div>
        {s.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Desconto</dt>
            <dd className="font-semibold">- {formatBRL(s.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="size-4" aria-hidden="true" /> Frete
          </dt>
          <dd className="font-semibold">
            {s.freeShipping ? <span className="text-success">Grátis</span> : s.shipping != null ? formatBRL(s.shipping) : <span className="text-muted-foreground">Informe o CEP</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="text-base font-bold">Total</dt>
          <dd className="text-2xl font-extrabold text-primary">{formatBRL(s.total)}</dd>
        </div>
        {s.oldSubtotal > s.subtotal && (
          <p className="text-right text-xs font-semibold text-success">Você economiza {formatBRL(s.oldSubtotal - s.subtotal + s.discount)}</p>
        )}
      </dl>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Carregando resumo" role="status">
      <div className="flex gap-3">
        <div className="size-16 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="h-11 rounded-lg bg-muted" />
      <div className="space-y-2 border-t border-border pt-4">
        <div className="h-4 rounded bg-muted" />
        <div className="h-4 rounded bg-muted" />
        <div className="h-7 rounded bg-muted" />
      </div>
    </div>
  );
}

export function OrderSummary(props: Props) {
  return (
    <aside className="co-card hidden p-6 lg:block" aria-label="Resumo do pedido">
      <h2 className="mb-4 text-lg font-extrabold text-primary">Resumo do pedido</h2>
      <SummaryBody {...props} />
    </aside>
  );
}

export function MobileSummary(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="co-card overflow-hidden lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="flex items-center gap-2 font-bold text-primary">
          {open ? "Ocultar resumo" : "Ver resumo"}
          {!props.loading && ` (${props.summary.count} ${props.summary.count === 1 ? "item" : "itens"})`}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
        {props.loading ? <span className="h-6 w-20 animate-pulse rounded bg-muted" /> : <span className="text-lg font-extrabold">{formatBRL(props.summary.total)}</span>}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <SummaryBody {...props} />
        </div>
      )}
    </div>
  );
}

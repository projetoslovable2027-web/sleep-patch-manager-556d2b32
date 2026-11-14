import { CheckCircle2, Loader2, Lock } from "@/components/checkout/icons";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/cart";

export function PaidScreen({ code, amount, email, onDone }: { code: string; amount: number; email?: string | undefined; onDone: () => void }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="co-card p-6 text-center md:p-8">
        <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-primary">Pagamento confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Pedido <strong className="text-foreground">{code}</strong> · {formatBRL(amount)}
        </p>
        <p className="mt-4 text-sm">
          Obrigado pela compra! Enviaremos os detalhes e o rastreio para <strong>{email || "seu e-mail"}</strong>.
        </p>
        <Button variant="checkout" size="xl" className="mt-6" onClick={onDone}>
          Voltar para a loja
        </Button>
      </div>
    </div>
  );
}

export type ThreeDS = { transaction: string | null; acsUrl?: string; payload?: Record<string, unknown> };

// Bank confirmation (3D Secure): the bank's page opens inside the card below, and we
// check the payment status every few seconds until it is approved or refused.
export function ThreeDSScreen({ data, onResult }: { data: ThreeDS; onResult: (status: "PAID" | "FAILED") => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const canShowBank = !!data.acsUrl && /^https:\/\//.test(data.acsUrl);

  useEffect(() => {
    if (canShowBank) formRef.current?.submit();
  }, [canShowBank]);

  useEffect(() => {
    if (!data.transaction) return;
    let stop = false;
    const started = Date.now();
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/payment-status?id=${encodeURIComponent(data.transaction!)}`);
        const s = (await res.json()).status as string | undefined;
        if (stop) return;
        if (s === "PAID") onResult("PAID");
        else if (s === "FAILED" || s === "CANCELLED" || s === "REFUSED") onResult("FAILED");
      } catch {
        /* try again on the next tick */
      }
      if (Date.now() - started > 10 * 60 * 1000) onResult("FAILED");
    }, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [data.transaction, onResult]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="co-card p-5 text-center md:p-6">
        <Lock className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h1 className="mt-2 text-xl font-extrabold text-primary">Confirme a compra com seu banco</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seu banco pediu uma confirmação de segurança. Siga as instruções abaixo ou no app do banco.</p>
        {canShowBank && (
          <>
            <form ref={formRef} method="POST" action={data.acsUrl} target="co-3ds-frame" className="hidden">
              {Object.entries(data.payload || {}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={String(v)} />
              ))}
            </form>
            <iframe name="co-3ds-frame" title="Confirmação do banco" className="mt-4 h-[460px] w-full rounded-xl border border-border bg-card" />
          </>
        )}
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Aguardando a confirmação do banco…
        </p>
      </div>
    </div>
  );
}

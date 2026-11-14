import { CheckCircle2, Copy } from "@/components/checkout/icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatBRL, type PixResult } from "@/lib/cart";
import { PixIcon } from "./parts";

export function PixScreen({ pix, onDone }: { pix: PixResult; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.pix);
    } catch {
      (document.getElementById("co-pix-code") as HTMLTextAreaElement | null)?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="co-card p-6 text-center md:p-8">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-extrabold text-primary">Pedido criado!</h1>
        <p className="mt-1 text-muted-foreground">
          Pedido <strong className="text-foreground">{pix.code}</strong>. Pague o Pix para confirmar.
        </p>
        <p className="mt-4 text-4xl font-extrabold">{formatBRL(pix.amount)}</p>

        <div className="co-qr mx-auto mt-6 w-56 rounded-xl border border-border bg-surface p-3" aria-label="QR Code do Pix" dangerouslySetInnerHTML={{ __html: pix.qrSvg }} />

        <label htmlFor="co-pix-code" className="mt-6 block text-left text-sm font-semibold">Pix Copia e Cola</label>
        <textarea id="co-pix-code" readOnly rows={3} value={pix.pix} className="co-input mt-1.5 h-auto resize-none py-2 font-mono text-xs" />
        <Button variant="pay" size="xl" className="mt-3" onClick={copy}>
          <Copy aria-hidden="true" /> {copied ? "Código copiado!" : "Copiar código Pix"}
        </Button>

        <ol className="mt-6 space-y-2 text-left text-sm">
          {[
            <>Abra o app do seu banco e escolha <strong>Pix</strong>.</>,
            <>Escaneie o QR Code ou cole o código <strong>Pix Copia e Cola</strong>.</>,
            <>Confirme o pagamento. A confirmação chega em <strong>{pix.email || "seu e-mail"}</strong>.</>,
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="co-step-badge size-6 text-xs">{i + 1}</span>
              <span className="pt-0.5">{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <PixIcon className="size-4 text-success" /> Aprovação imediata após o pagamento
      </div>
      <Button variant="link" className="mx-auto mt-2 flex" onClick={onDone}>
        Voltar para a loja
      </Button>
    </div>
  );
}

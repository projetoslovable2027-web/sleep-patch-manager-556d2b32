import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Loader2, Lock, ShoppingBag, Truck, Zap } from "@/components/checkout/icons";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { MobileSummary, OrderSummary } from "@/components/checkout/OrderSummary";
import { CheckoutFooter, CheckoutHeader, Field, PixIcon, StepCard, type StepState } from "@/components/checkout/parts";
import { PixScreen } from "@/components/checkout/PixScreen";
import { Button } from "@/components/ui/button";
import { BUMP, MAX_INSTALLMENTS, formatBRL, isValidCep, loadCart, readTracking, saveCart, setQty, summarize, thumb, type CartState } from "@/lib/cart";
import { CARD_MASKS, MASKS, cardBrand, emptyCard, emptyForm, validateAddress, validateCard, validateIdentity, type CardErrors, type CardForm, type CheckoutForm, type FieldErrors } from "@/lib/checkout-form";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra | Patch Sleep" },
      { name: "description", content: "Finalize sua compra do Patch Sleep com Pix ou cartão de crédito, rápido e seguro." },
      { property: "og:title", content: "Finalizar compra | Patch Sleep" },
      { property: "og:description", content: "Finalize sua compra do Patch Sleep com Pix ou cartão de crédito, rápido e seguro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    // Start downloading the fonts and logo with the page instead of after the styles load.
    links: [
      ...["Regular", "SemiBold", "Bold", "ExtraBold"].map((w) => ({ rel: "preload", href: `/fonts/Gilroy-${w}.woff2`, as: "font", type: "font/woff2", crossOrigin: "anonymous" as const })),
      { rel: "preload", href: "/images/logo.svg", as: "image" },
    ],
  }),
  component: CheckoutPage,
});

const FORM_KEY = "ps-checkout-form-v1";
type Step = 1 | 2 | 3;

function CheckoutPage() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [step, setStep] = useState<Step>(1);
  const [completed, setCompleted] = useState<0 | 1 | 2>(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [installments, setInstallments] = useState(MAX_INSTALLMENTS);
  // Card data stays in memory only (never saved to the browser storage or sent to our server).
  const [card, setCard] = useState<CardForm>(emptyCard);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const lastCep = useRef("");

  useEffect(() => {
    const c = loadCart();
    setCart(c);
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORM_KEY) || "{}");
      setForm({ ...emptyForm, ...saved, zipcode: saved.zipcode || (c.cep ? MASKS.zipcode!(c.cep) : "") });
    } catch {
      /* ignore */
    }
    readTracking();
  }, []);

  useEffect(() => {
    if (cart) saveCart(cart);
  }, [cart]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  // Until the saved cart is read (right after the page appears), the form is shown with a placeholder summary.
  const loading = cart === null;

  if (cart && cart.pix && cart.items.length === 0) {
    return (
      <Shell>
        <PixScreen
          pix={cart.pix}
          onDone={() => {
            saveCart({ ...cart, pix: null });
            window.location.href = "/";
          }}
        />
      </Shell>
    );
  }

  if (cart && !cart.items.some((i) => i.id !== BUMP.id)) {
    return (
      <Shell>
        <div className="co-card mx-auto max-w-md p-8 text-center">
          <ShoppingBag className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-extrabold text-primary">Seu carrinho está vazio</h1>
          <p className="mt-1 text-muted-foreground">Escolha seu kit Patch Sleep para continuar.</p>
          <Button asChild variant="checkout" size="xl" className="mt-6">
            <a href="/">Ver produtos</a>
          </Button>
        </div>
      </Shell>
    );
  }

  const summary = summarize(cart?.items ?? [], { coupon: cart?.coupon ?? null, cep: cart?.cep ?? "" });

  const hasBump = !!cart?.items.some((i) => i.id === BUMP.id);
  const toggleBump = () =>
    setCart((c) => (c ? { ...c, items: hasBump ? c.items.filter((i) => i.id !== BUMP.id) : [...c.items, { id: BUMP.id, qty: 1 }] } : c));

  const update = (name: keyof CheckoutForm, raw: string) => {
    const value = MASKS[name] ? MASKS[name]!(raw) : raw;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    if (name === "zipcode") onCep(value);
  };

  async function onCep(value: string) {
    const cep = value.replace(/\D/g, "");
    setCart((c) => (c ? { ...c, cep: isValidCep(cep) ? cep : "" } : c));
    if (!isValidCep(cep) || cep === lastCep.current) return;
    lastCep.current = cep;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const a = await res.json();
      if (a.erro) {
        setErrors((e) => ({ ...e, zipcode: "CEP não encontrado. Confira os números." }));
        return;
      }
      setForm((f) => ({
        ...f,
        street: f.street || a.logradouro || "",
        district: f.district || a.bairro || "",
        city: f.city || a.localidade || "",
        state: f.state || a.uf || "",
      }));
      setTimeout(() => document.getElementById(a.logradouro ? "co-number" : "co-street")?.focus(), 0);
    } catch {
      /* address lookup is only a convenience */
    }
  }

  const stateOf = (n: Step): StepState => (n === step ? "open" : n <= completed ? "done" : "locked");
  const go = (n: Step) => {
    setPayError("");
    setStep(n);
  };

  const submitIdentity = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateIdentity(form);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirst(errs);
    setCompleted((c) => (c < 1 ? 1 : c));
    go(completed >= 2 ? 3 : 2);
  };

  const submitAddress = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(form);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirst(errs);
    setCompleted(2);
    go(3);
  };

  async function pay() {
    if (submitting) return;
    const idErrs = validateIdentity(form);
    const addrErrs = validateAddress(form);
    if (Object.keys(idErrs).length || Object.keys(addrErrs).length) {
      setErrors({ ...idErrs, ...addrErrs });
      go(Object.keys(idErrs).length ? 1 : 2);
      return;
    }
    if (method === "card") {
      const errs = validateCard(card);
      setCardErrors(errs);
      const first = Object.keys(errs)[0];
      if (first) {
        setTimeout(() => document.getElementById(`co-card-${first}`)?.focus(), 0);
        return;
      }
    }
    setSubmitting(true);
    setPayError("");
    try {
      const res = await fetch("/api/public/payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          installments: method === "card" ? installments : 1,
          items: cart!.items,
          coupon: cart!.coupon,
          customer: { name: form.name.trim(), email: form.email.trim(), document: form.document, phone: form.phone },
          address: {
            zipcode: form.zipcode,
            street: form.street.trim(),
            number: form.number.trim(),
            complement: form.complement.trim(),
            district: form.district.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
          },
          tracking: readTracking(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.pix) throw new Error(data.error || "Não foi possível concluir o pagamento agora. Tente novamente.");
      setCart({ items: [], coupon: null, cep: "", pix: { ...data, email: form.email.trim(), createdAt: Date.now() } });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Não foi possível concluir o pagamento agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const summaryProps = {
    summary,
    loading,
    coupon: cart?.coupon ?? null,
    onQty: (id: string, qty: number) => setCart((c) => (c ? { ...c, items: setQty(c.items, id, qty) } : c)),
    onCoupon: (code: string | null) => setCart((c) => (c ? { ...c, coupon: code } : c)),
  };

  const updateCard = (name: keyof CardForm, raw: string) => {
    setCard((c) => ({ ...c, [name]: CARD_MASKS[name] ? CARD_MASKS[name]!(raw) : raw }));
    if (cardErrors[name]) setCardErrors((e) => ({ ...e, [name]: undefined }));
  };
  const cardField = (name: keyof CardForm, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field {...extra} name={`card-${name}`} label={label} value={card[name]} error={cardErrors[name]} onChange={(e) => updateCard(name, e.target.value)} />
  );
  const brand = cardBrand(card.number);

  const field = (name: keyof CheckoutForm, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field {...extra} name={name} label={label} value={form[name]} error={errors[name]} onChange={(e) => update(name, e.target.value)} />
  );

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" /> Continuar comprando
        </a>
        <h1 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Finalizar compra</h1>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="space-y-4">
          <MobileSummary {...summaryProps} />

          <StepCard
            number={1}
            title="Identificação"
            hint="Usaremos seu e-mail e celular para enviar a confirmação do pedido."
            state={stateOf(1)}
            onEdit={() => go(1)}
            summary={
              <>
                <p className="font-semibold">{form.name}</p>
                <p className="text-muted-foreground">{form.email} · {form.phone}</p>
              </>
            }
          >
            <form onSubmit={submitIdentity} noValidate className="grid gap-4 sm:grid-cols-2">
              {field("name", "Nome completo", { autoComplete: "name", className: "sm:col-span-2", placeholder: "Seu nome e sobrenome" })}
              {field("email", "E-mail", { type: "email", autoComplete: "email", className: "sm:col-span-2", placeholder: "seu@email.com" })}
              {field("document", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" })}
              {field("phone", "Celular / WhatsApp", { type: "tel", autoComplete: "tel-national", placeholder: "(11) 99999-9999" })}
              <Button type="submit" variant="checkout" size="xl" className="sm:col-span-2">
                Continuar
              </Button>
            </form>
          </StepCard>

          <StepCard
            number={2}
            title="Entrega"
            hint="Informe o CEP para preencher o endereço automaticamente."
            state={stateOf(2)}
            onEdit={() => go(2)}
            summary={
              <>
                <p className="font-semibold">
                  {form.street}, {form.number}
                  {form.complement ? ` – ${form.complement}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {form.district}, {form.city} - {form.state} · CEP {form.zipcode}
                </p>
              </>
            }
          >
            <form onSubmit={submitAddress} noValidate className="grid grid-cols-6 gap-4">
              {field("zipcode", "CEP", { inputMode: "numeric", autoComplete: "postal-code", placeholder: "00000-000", className: "col-span-6 sm:col-span-3" })}
              <div className="col-span-6 hidden items-end pb-3 sm:col-span-3 sm:flex">
                <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                  Não sei meu CEP
                </a>
              </div>
              {field("street", "Rua / Avenida", { autoComplete: "address-line1", className: "col-span-6 sm:col-span-4" })}
              {field("number", "Número", { inputMode: "numeric", className: "col-span-2 sm:col-span-2" })}
              {field("complement", "Complemento (opcional)", { autoComplete: "address-line2", className: "col-span-4 sm:col-span-6", placeholder: "Apto, bloco, referência" })}
              {field("district", "Bairro", { className: "col-span-6 sm:col-span-2" })}
              {field("city", "Cidade", { autoComplete: "address-level2", className: "col-span-4 sm:col-span-3" })}
              {field("state", "UF", { autoComplete: "address-level1", placeholder: "SP", className: "col-span-2 sm:col-span-1" })}

              {isValidCep(form.zipcode) && (
                <div className="col-span-6">
                  <p className="mb-2 text-sm font-semibold">Forma de entrega</p>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3">
                    <span className="flex size-5 items-center justify-center rounded-full border-2 border-primary" aria-hidden="true">
                      <span className="size-2.5 rounded-full bg-primary" />
                    </span>
                    <Truck className="size-5 text-primary" aria-hidden="true" />
                    <span className="flex-1 font-semibold">Entrega padrão</span>
                    <span className="font-bold">{summary.freeShipping ? <span className="text-success">Grátis</span> : formatBRL(summary.shipping || 0)}</span>
                  </div>
                  {!summary.freeShipping && summary.remainingForFree > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Faltam <strong className="text-foreground">{formatBRL(summary.remainingForFree)}</strong> para ganhar frete grátis.
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" variant="checkout" size="xl" className="col-span-6">
                Continuar
              </Button>
            </form>
          </StepCard>

          <StepCard number={3} title="Pagamento" hint={stateOf(3) === "open" ? "Escolha Pix (aprovação imediata) ou cartão de crédito." : "Preencha os passos anteriores para escolher o pagamento."} state={stateOf(3)}>
            <div className="space-y-4">
              <div role="radiogroup" aria-label="Forma de pagamento" className="space-y-4 pt-3">
                <MethodOption
                  selected={method === "pix"}
                  onSelect={() => setMethod("pix")}
                  icon={<PixIcon className="size-5 text-success" />}
                  title="Pix"
                  subtitle="QR Code e Copia e Cola"
                  price={formatBRL(summary.total)}
                  badge={
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-success px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-success-foreground shadow-sm">
                      <Zap className="size-3" aria-hidden="true" /> Aprovação imediata
                    </span>
                  }
                />
                <MethodOption
                  selected={method === "card"}
                  onSelect={() => setMethod("card")}
                  icon={<CreditCard className="size-5 text-primary" aria-hidden="true" />}
                  title="Cartão de crédito"
                  subtitle={`Em até ${MAX_INSTALLMENTS}x de ${formatBRL(summary.total / MAX_INSTALLMENTS)} sem juros`}
                  price={formatBRL(summary.total)}
                />
              </div>

              <label className={`flex cursor-pointer gap-3 rounded-xl border-2 border-dashed p-4 transition-colors ${hasBump ? "border-success bg-success-soft" : "border-primary/40 bg-primary-soft/50"}`}>
                <input type="checkbox" checked={hasBump} onChange={toggleBump} className="mt-1 size-5 shrink-0 accent-[var(--color-success)]" />
                <img src={thumb(BUMP.image)} alt="" width="64" height="64" className="size-16 shrink-0 rounded-lg bg-surface object-contain" />
                <span className="flex-1 text-sm">
                  <span className="block text-xs font-extrabold uppercase tracking-wide text-primary">Oferta única · só nesta compra</span>
                  <span className="block font-bold">Sim! Quero +1 pacote extra (48 adesivos)</span>
                  <span className="block text-muted-foreground">
                    De <s>{formatBRL(BUMP.oldPrice)}</s> por <strong className="text-success">{formatBRL(BUMP.price)}</strong>. Garanta mais um mês de sono tranquilo.
                  </span>
                </span>
              </label>

              {method === "pix" ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• O código Pix aparece na próxima tela, pronto para pagar no app do seu banco.</li>
                  <li>• Seu pedido é aprovado na hora, assim que o pagamento é feito.</li>
                </ul>
              ) : (
                <div className="grid grid-cols-6 gap-4 rounded-xl border border-border bg-surface p-4">
                  <div className="relative col-span-6">
                    {cardField("number", "Número do cartão", { inputMode: "numeric", autoComplete: "cc-number", placeholder: "0000 0000 0000 0000" })}
                    {brand && (
                      <span className="pointer-events-none absolute right-3 top-[38px] rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary">
                        {brand}
                      </span>
                    )}
                  </div>
                  {cardField("holder", "Nome impresso no cartão", { autoComplete: "cc-name", placeholder: "Como está no cartão", className: "col-span-6" })}
                  {cardField("expiry", "Validade", { inputMode: "numeric", autoComplete: "cc-exp", placeholder: "MM/AA", className: "col-span-3" })}
                  {cardField("cvv", "CVV", { inputMode: "numeric", autoComplete: "cc-csc", placeholder: brand === "amex" ? "0000" : "000", className: "col-span-3" })}
                  <div className="col-span-6">
                    <label className="mb-1.5 block text-sm font-semibold" htmlFor="co-installments">
                      Parcelas
                    </label>
                    <select id="co-installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="co-input w-full">
                      {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatBRL(summary.total / n)} sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="col-span-6 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" aria-hidden="true" /> Seus dados são criptografados e não ficam salvos no site.
                  </p>
                </div>
              )}
              {payError && (
                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
                  {payError}
                </p>
              )}
              {method === "pix" ? (
                <Button variant="pay" size="xl" onClick={pay} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PixIcon />}
                  {submitting ? "Gerando Pix…" : `Pagar ${formatBRL(summary.total)} com Pix`}
                </Button>
              ) : (
                <Button variant="checkout" size="xl" className="w-full" onClick={pay} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
                  {submitting ? "Processando…" : `Pagar ${installments}x de ${formatBRL(summary.total / installments)}`}
                </Button>
              )}
            </div>
          </StepCard>
        </div>

        <div className="lg:sticky lg:top-6">
          <OrderSummary {...summaryProps} />
        </div>
      </div>
    </Shell>
  );
}

function MethodOption(props: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  price: string;
  badge?: React.ReactNode;
}) {
  const tone = props.selected ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/50";
  return (
    <button type="button" role="radio" aria-checked={props.selected} onClick={props.onSelect} className={`relative flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${tone}`}>
      {props.badge && <span className="absolute -top-3 right-3">{props.badge}</span>}
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${props.selected ? "border-primary" : "border-muted-foreground/40"}`} aria-hidden="true">
        {props.selected && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <span className="shrink-0">{props.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap font-bold leading-tight">{props.title}</span>
        <span className="block font-extrabold text-primary sm:hidden">{props.price}</span>
        <span className="block text-xs text-muted-foreground">{props.subtitle}</span>
      </span>
      <span className="hidden shrink-0 whitespace-nowrap font-extrabold sm:block">{props.price}</span>
    </button>
  );
}

function focusFirst(errs: FieldErrors) {
  const first = Object.keys(errs)[0];
  if (first) setTimeout(() => document.getElementById(`co-${first}`)?.focus(), 0);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CheckoutHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">{children}</main>
      <CheckoutFooter />
    </div>
  );
}

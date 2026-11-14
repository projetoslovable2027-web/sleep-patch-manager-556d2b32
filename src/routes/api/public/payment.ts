import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { cardSaleBody, pixSaleBody } from "@/lib/blackcat";
// @ts-expect-error plain browser module without type declarations
import { buildOrder, isValidCpf, isValidPhone, isValidCep, normalizeCoupon, MAX_INSTALLMENTS } from "../../../../public/cart/cart-core.js";

// Creates the payment for a checkout order (Pix or card). Prices are always
// recomputed here from the kit list, never taken from the browser.
// Pix and card are charged through BlackCat (key in STRIPE_LIVE_API_KEY, read only here).
// Card data is passed straight to BlackCat: never store it, log it or echo it back.

const digits = (s: string) => s.replace(/\D/g, "");
const text = (max: number) => z.string().trim().min(1).max(max);

const Body = z.object({
  method: z.enum(["pix", "card"]),
  installments: z.number().int().min(1).max(MAX_INSTALLMENTS as number).optional().default(1),
  items: z
    .array(z.object({ id: z.enum(["kit-1", "kit-2", "kit-3", "bump-1"]), qty: z.number().int().min(1).max(20) }))
    .min(1)
    .max(10)
    .refine((items) => items.some((i) => i.id !== "bump-1"), "Escolha um kit"),
  coupon: z.string().max(40).nullish(),
  customer: z.object({
    name: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(160),
    document: z.string().refine((v) => isValidCpf(v), "CPF inválido"),
    phone: z.string().refine((v) => isValidPhone(v), "Telefone inválido"),
  }),
  address: z.object({
    zipcode: z.string().refine((v) => isValidCep(v), "CEP inválido"),
    street: text(160),
    number: text(20),
    complement: z.string().trim().max(80).optional().default(""),
    district: text(100),
    city: text(100),
    state: z.string().trim().length(2),
  }),
  tracking: z.record(z.string().max(200)).optional(),
  card: z
    .object({
      number: z.string().regex(/^\d{13,19}$/),
      holderName: z.string().trim().min(3).max(60),
      expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
      expiryYear: z.string().regex(/^20\d{2}$/),
      cvv: z.string().regex(/^\d{3,4}$/),
    })
    .optional(),
  device: z
    .object({
      http_browser_language: z.string().max(20),
      http_browser_color_depth: z.number().int().min(0).max(64),
      http_browser_screen_height: z.number().int().min(0).max(20000),
      http_browser_screen_width: z.number().int().min(0).max(20000),
      http_browser_time_difference: z.number().int().min(-900).max(900),
      http_browser_java_enabled: z.boolean(),
      http_browser_javascript_enabled: z.boolean(),
    })
    .partial()
    .optional(),
});

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", email: "E-mail", document: "CPF", phone: "Celular", zipcode: "CEP", street: "Rua",
  number: "Número", district: "Bairro", city: "Cidade", state: "Estado",
  holderName: "Nome no cartão", expiryMonth: "Validade", expiryYear: "Validade", cvv: "CVV",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.safeParse(await request.json());
        } catch {
          return json({ error: "Pedido inválido." }, 400);
        }
        if (!parsed.success) {
          const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[i.path.length - 1])))];
          const labels = fields.map((f) => FIELD_LABELS[f]).filter(Boolean);
          return json({ error: labels.length ? `Confira: ${labels.join(", ")}.` : "Confira os dados do pedido." }, 400);
        }
        const { items, coupon, address } = parsed.data;
        const order = buildOrder(items, { coupon: normalizeCoupon(coupon), cep: digits(address.zipcode) }, new URL(request.url).origin);
        if (!order.products.length || order.totals.total <= 0) return json({ error: "Seu carrinho está vazio." }, 400);

        const apiKey = process.env['STRIPE_LIVE_API_KEY'];
        if (!apiKey) return json({ error: "Os pagamentos estão sendo configurados. Tente novamente em breve." }, 503);

        const code = "PS" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();
        const isCard = parsed.data.method === "card";
        if (isCard && !parsed.data.card) return json({ error: "Confira os dados do cartão." }, 400);
        const body = isCard
          ? cardSaleBody(order, parsed.data, code, parsed.data.card!, parsed.data.installments, {
              ...parsed.data.device,
              user_agent: (request.headers.get("user-agent") || "").slice(0, 400),
            })
          : pixSaleBody(order, parsed.data, code);
        const fail = isCard ? "Não foi possível processar o cartão agora. Tente novamente em instantes ou pague com Pix." : "Não foi possível gerar o Pix agora. Tente novamente em instantes.";
        let data: any;
        let httpStatus = 0;
        try {
          const res = await fetch("https://api.blackcatoficial.com/api/sales/create-sale", {
            method: "POST",
            headers: { "content-type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify(body),
          });
          httpStatus = res.status;
          data = await res.json().catch(() => ({}));
        } catch (err) {
          console.error("BlackCat create-sale error", isCard ? "card" : "pix", err instanceof Error ? err.message : "");
          return json({ error: fail }, 424);
        }
        if (httpStatus < 200 || httpStatus >= 300 || !data?.success || !data.data) {
          console.error("BlackCat create-sale failed", isCard ? "card" : "pix", httpStatus, data?.message, data?.error);
          const msg = httpStatus === 400 || httpStatus === 422 ? (isCard ? "Confira os dados do cartão e tente novamente." : "Não foi possível gerar o Pix. Confira seus dados e tente novamente.") : fail;
          return json({ error: msg }, 424);
        }

        if (isCard) {
          const sale = data.data;
          const status = String(sale.status || "").toUpperCase();
          const amount = (sale.amount ?? order.totals.total) / 100;
          if (status === "PAID" || status === "APPROVED") return json({ status: "PAID", code, amount, transaction: sale.transactionId ?? null });
          if (status === "PENDING_3DS" && sale.threeDS?.start?.acsUrl) {
            const start = sale.threeDS.start;
            return json({
              status: "PENDING_3DS",
              code,
              amount,
              transaction: sale.transactionId ?? null,
              threeDS: { acsUrl: String(start.acsUrl), payload: start.acsPayload && typeof start.acsPayload === "object" ? start.acsPayload : {} },
            });
          }
          if (status === "PENDING" || status === "PROCESSING") return json({ status: "PENDING", code, amount, transaction: sale.transactionId ?? null });
          console.error("BlackCat card refused", status, sale.refusedReason?.code);
          return json({ error: "Pagamento recusado pelo banco. Confira os dados, tente outro cartão ou pague com Pix." }, 402);
        }

        const sale = data.data;
        const pd = sale.paymentData || {};
        const pix = pd.copyPaste || pd.qrCode;
        if (!pix) return json({ error: "Não foi possível gerar o Pix agora. Tente novamente." }, 424);
        const qr = typeof pd.qrCodeBase64 === "string" ? pd.qrCodeBase64 : "";
        return json({
          transaction: sale.transactionId ?? null,
          code,
          amount: (sale.amount ?? order.totals.total) / 100,
          status: String(sale.status || "PENDING").toUpperCase(),
          pix,
          qrImage: qr && !qr.startsWith("data:") ? `data:image/png;base64,${qr}` : qr,
          expiresAt: pd.expiresAt ?? null,
        });
      },
    },
  },
});

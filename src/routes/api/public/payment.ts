import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
// @ts-expect-error plain browser module without type declarations
import { buildOrder, isValidCpf, isValidPhone, isValidCep, normalizeCoupon, MAX_INSTALLMENTS } from "../../../../public/cart/cart-core.js";

// Creates the payment for a checkout order (Pix or card). Prices are always
// recomputed here from the kit list, never taken from the browser.
// The payment gateway is not connected yet: once it is, `chargeWithGateway`
// sends the order to it and returns the Pix code / card result.

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
});

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", email: "E-mail", document: "CPF", phone: "Celular", zipcode: "CEP", street: "Rua",
  number: "Número", district: "Bairro", city: "Cidade", state: "Estado",
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

        // No payment gateway connected yet.
        return json({ error: "Os pagamentos estão sendo configurados. Tente novamente em breve." }, 503);
      },
    },
  },
});

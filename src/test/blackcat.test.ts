import { describe, expect, it } from "vitest";
// @ts-expect-error plain browser module without type declarations
import { buildOrder } from "../../public/cart/cart-core.js";
import { pixSaleBody, saleItems } from "@/lib/blackcat";

const input = {
  customer: { name: "Maria Souza", email: "maria@email.com", document: "529.982.247-25", phone: "(11) 98888-7777" },
  address: { zipcode: "01310-100", street: "Av. Paulista", number: "1000", complement: "", district: "Bela Vista", city: "São Paulo", state: "sp" },
};
const sum = (items: { unitPrice: number; quantity: number }[]) => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

describe("BlackCat Pix sale", () => {
  it("1 pacote + frete is charged R$78,90 (7890 cents) with shipping as its own item", () => {
    const order = buildOrder([{ id: "kit-1", qty: 1 }], { cep: "01310100" });
    const body = pixSaleBody(order, input, "PS1");
    expect(body.amount).toBe(7890);
    expect(body.items.find((i) => i.title === "Frete")?.unitPrice).toBe(1990);
    expect(sum(body.items)).toBe(7890);
  });

  it("with coupon PRIMEIRA15 the items still add up to the discounted total", () => {
    const order = buildOrder([{ id: "kit-1", qty: 1 }, { id: "kit-2", qty: 2 }], { coupon: "PRIMEIRA15", cep: "01310100" });
    const items = saleItems(order);
    expect(order.totals.total).toBe(21505); // (59 + 2×97) − 15% = R$215,05
    expect(sum(items)).toBe(order.totals.total);
  });

  it("sends CPF and phone as numbers only, and the address for delivery", () => {
    const body = pixSaleBody(buildOrder([{ id: "kit-2", qty: 1 }], { cep: "01310100" }), input, "PS1");
    expect(body.customer.document).toEqual({ number: "52998224725", type: "cpf" });
    expect(body.customer.phone).toBe("11988887777");
    expect(body.shipping.zipCode).toBe("01310100");
    expect(body.shipping.state).toBe("SP");
  });
});

describe("BlackCat card sale", () => {
  it("turns the typed card into BlackCat's fields (MM/AA -> month and 4-digit year)", async () => {
    const { cardForGateway } = await import("@/lib/checkout-form");
    expect(cardForGateway({ number: "4111 1111 1111 1111", holder: " MARIA  SOUZA ", expiry: "08/29", cvv: "123" })).toEqual({
      number: "4111111111111111",
      holderName: "MARIA SOUZA",
      expiryMonth: "08",
      expiryYear: "2029",
      cvv: "123",
    });
  });

  it("charges the order total by credit card with the chosen installments", async () => {
    const { cardSaleBody } = await import("@/lib/blackcat");
    const order = buildOrder([{ id: "kit-3", qty: 1 }], { cep: "01310100" });
    const card = { number: "4111111111111111", holderName: "MARIA SOUZA", expiryMonth: "08", expiryYear: "2029", cvv: "123" };
    const body = cardSaleBody(order, input, "PS1", card, 5, { http_browser_language: "pt-BR" });
    expect(body.paymentMethod).toBe("credit_card");
    expect(body.amount).toBe(12700);
    expect(body.card.installments).toBe(5);
    expect(sum(body.items)).toBe(12700);
  });
});

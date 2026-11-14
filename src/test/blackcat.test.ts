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
    expect(order.totals.total).toBe(21500); // (59 + 2×97) − 15%
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

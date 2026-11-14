import { describe, expect, it } from "vitest";
// @ts-expect-error plain browser module without type declarations
import { addItem, setQty, summarize, normalizeCoupon, KITS, PRODUCT_NAME, FREE_SHIPPING_MIN } from "../../public/cart/cart-core.js";

describe("cart rules", () => {
  it("adding the same kit twice increases its quantity", () => {
    const items = addItem(addItem([], "kit-1"), "kit-1");
    expect(items).toEqual([{ id: "kit-1", qty: 2 }]);
  });

  it("kit prices are R$59, R$97 and R$127", () => {
    expect(summarize([{ id: "kit-1", qty: 1 }]).subtotal).toBe(59);
    expect(summarize([{ id: "kit-2", qty: 1 }]).subtotal).toBe(97);
    expect(summarize([{ id: "kit-3", qty: 1 }]).subtotal).toBe(127);
  });

  it("coupon PRIMEIRA15 gives 15% off", () => {
    const s = summarize([{ id: "kit-1", qty: 1 }, { id: "kit-2", qty: 1 }], { coupon: normalizeCoupon("primeira15") });
    expect(s.discount).toBe(23.4);
    expect(s.total).toBe(132.6);
  });

  it("1 pacote below R$97 is missing R$38 for free shipping", () => {
    const s = summarize([{ id: "kit-1", qty: 1 }]);
    expect(s.freeShipping).toBe(false);
    expect(s.remainingForFree).toBe(38);
  });

  it("free shipping threshold is R$97", () => {
    expect(FREE_SHIPPING_MIN).toBe(97);
    const s = summarize([{ id: "kit-1", qty: 2 }]);
    expect(s.subtotal).toBe(118);
    expect(s.freeShipping).toBe(true);
    expect(s.shipping).toBe(0);
  });

  it("kits with 2 or more pacotes ship free", () => {
    expect(summarize([{ id: "kit-2", qty: 1 }]).shipping).toBe(0);
  });

  it("removing the last unit empties the cart", () => {
    expect(setQty([{ id: "kit-1", qty: 1 }], "kit-1", 0)).toEqual([]);
  });

  it("installments are up to 5x without interest", () => {
    expect(summarize([{ id: "kit-1", qty: 1 }]).installment).toBe(11.8);
  });

  it("the 3 products are Patch Sleep with their kit image and card", () => {
    expect(PRODUCT_NAME).toBe("Patch Sleep");
    expect(KITS.map((k: { option: string; price: number; image: string }) => [k.option, k.price, k.image])).toEqual([
      ["1 Mês", 59, "/images/adesivo-patch-sleep-principal.webp"],
      ["4 meses", 97, "/images/adesivo-patch-sleep-kit2.webp"],
      ["6 Meses", 127, "/images/adesivo-patch-sleep-kit3.webp"],
    ]);
  });
});

describe("checkout order", () => {
  it("prices in cents and total = products + shipping - discount", async () => {
    // @ts-expect-error plain browser module without type declarations
    const { buildOrder } = await import("../../public/cart/cart-core.js");
    const o = buildOrder([{ id: "kit-1", qty: 1 }], { coupon: "PRIMEIRA15", cep: "01310000" }, "https://loja.com");
    expect(o.products[0]).toMatchObject({ code: "kit-1", unit_price: 5900, quantity: 1, image_url: "https://loja.com/images/adesivo-patch-sleep-principal.webp" });
    expect(o.totals).toMatchObject({ currency: "BRL", shipping: 1990, discount: 885 });
    expect(o.totals.total).toBe(5900 + 1990 - 885);
  });

  it("2 Pacotes kit ships free, so the order is exactly R$97", async () => {
    // @ts-expect-error plain browser module without type declarations
    const { buildOrder } = await import("../../public/cart/cart-core.js");
    const o = buildOrder([{ id: "kit-2", qty: 1 }], { cep: "01310000" });
    expect(o.totals.shipping).toBe(0);
    expect(o.totals.total).toBe(9700);
  });

  it("accepts only valid CPFs and phones with DDD", async () => {
    // @ts-expect-error plain browser module without type declarations
    const { isValidCpf, isValidPhone } = await import("../../public/cart/cart-core.js");
    expect(isValidCpf("746.000.270-43")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("746.000.270-44")).toBe(false);
    expect(isValidPhone("(11) 99999-9999")).toBe(true);
    expect(isValidPhone("99999-9999")).toBe(false);
  });
});

describe("order bump", () => {
  it("adds +1 pacote extra at R$ 29,90, once per order", async () => {
    const s = summarize([{ id: "kit-1", qty: 1 }, { id: "bump-1", qty: 3 }]);
    expect(s.subtotal).toBe(88.9);
  });
});

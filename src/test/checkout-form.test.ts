import { describe, expect, it } from "vitest";

import { emptyForm, maskCep, maskCpf, maskPhone, validateAddress, validateIdentity } from "@/lib/checkout-form";

const identity = { ...emptyForm, name: "Maria Silva", email: "maria@gmail.com", document: "746.000.270-43", phone: "(11) 98765-4321" };
const address = { ...identity, zipcode: "01310-100", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP" };

describe("checkout form rules", () => {
  it("accepts complete identification data", () => {
    expect(validateIdentity(identity)).toEqual({});
  });

  it("requires first and last name", () => {
    expect(validateIdentity({ ...identity, name: "Maria" }).name).toBeDefined();
  });

  it("rejects an invalid CPF", () => {
    expect(validateIdentity({ ...identity, document: "111.111.111-11" }).document).toBeDefined();
    expect(validateIdentity({ ...identity, document: "746.000.270-44" }).document).toBeDefined();
  });

  it("requires a phone with area code", () => {
    expect(validateIdentity({ ...identity, phone: "98765-4321" }).phone).toBeDefined();
  });

  it("accepts a complete address and requires the 8-digit CEP and 2-letter state", () => {
    expect(validateAddress(address)).toEqual({});
    expect(validateAddress({ ...address, zipcode: "0131" }).zipcode).toBeDefined();
    expect(validateAddress({ ...address, state: "São Paulo" }).state).toBeDefined();
  });

  it("complement is optional, number is required", () => {
    expect(validateAddress({ ...address, complement: "" }).complement).toBeUndefined();
    expect(validateAddress({ ...address, number: "" }).number).toBeDefined();
  });

  it("formats CPF, phone and CEP as the customer types", () => {
    expect(maskCpf("74600027043")).toBe("746.000.270-43");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskCep("01310100")).toBe("01310-100");
  });
});

import { emptyCard, isValidCardNumber, isValidExpiry, maskCardNumber, maskExpiry, validateCard } from "@/lib/checkout-form";

describe("credit card rules", () => {
  const now = new Date(2026, 10, 14);
  const card = { ...emptyCard, number: "4111 1111 1111 1111", holder: "MARIA SILVA", expiry: "12/28", cvv: "123" };

  it("accepts a complete valid card", () => {
    expect(validateCard(card, now)).toEqual({});
  });

  it("rejects a card number that fails the check digit", () => {
    expect(isValidCardNumber("4111 1111 1111 1112")).toBe(false);
    expect(validateCard({ ...card, number: "4111 1111 1111 1112" }, now).number).toBeDefined();
  });

  it("rejects an expired card but accepts the current month", () => {
    expect(isValidExpiry("10/26", now)).toBe(false);
    expect(isValidExpiry("11/26", now)).toBe(true);
    expect(isValidExpiry("13/27", now)).toBe(false);
  });

  it("needs 3 CVV digits (4 for Amex)", () => {
    expect(validateCard({ ...card, cvv: "12" }, now).cvv).toBeDefined();
    expect(validateCard({ ...card, number: "3782 822463 10005", cvv: "123" }, now).cvv).toBeDefined();
    expect(validateCard({ ...card, number: "3782 822463 10005", cvv: "1234" }, now).cvv).toBeUndefined();
  });

  it("formats number and expiry while typing", () => {
    expect(maskCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(maskExpiry("1228")).toBe("12/28");
  });
});

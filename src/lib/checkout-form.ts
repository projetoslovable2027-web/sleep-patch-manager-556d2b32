// Checkout form fields, input masks and validation rules (per step).
import { isValidCep, isValidCpf, isValidPhone } from "@/lib/cart";

export type CheckoutForm = {
  name: string;
  email: string;
  document: string;
  phone: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};
export type FieldErrors = Partial<Record<keyof CheckoutForm, string>>;

export const emptyForm: CheckoutForm = {
  name: "", email: "", document: "", phone: "", zipcode: "", street: "",
  number: "", complement: "", district: "", city: "", state: "",
};

const digits = (v: string) => v.replace(/\D/g, "");

export function maskCpf(v: string) {
  const d = digits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length > 10) return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  if (d.length > 6) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  if (d.length > 2) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  return d;
}

export function maskCep(v: string) {
  const d = digits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function maskUf(v: string) {
  return v.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
}

export const MASKS: Partial<Record<keyof CheckoutForm, (v: string) => string>> = {
  document: maskCpf,
  phone: maskPhone,
  zipcode: maskCep,
  state: maskUf,
};

export function validateIdentity(f: CheckoutForm): FieldErrors {
  const e: FieldErrors = {};
  if (f.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Digite um e-mail válido.";
  if (!isValidCpf(f.document)) e.document = "Digite um CPF válido.";
  if (!isValidPhone(f.phone)) e.phone = "Digite um celular válido com DDD.";
  return e;
}

export function validateAddress(f: CheckoutForm): FieldErrors {
  const e: FieldErrors = {};
  if (!isValidCep(f.zipcode)) e.zipcode = "Digite um CEP válido com 8 números.";
  if (!f.street.trim()) e.street = "Informe a rua.";
  if (!f.number.trim()) e.number = "Informe o número.";
  if (!f.district.trim()) e.district = "Informe o bairro.";
  if (!f.city.trim()) e.city = "Informe a cidade.";
  if (f.state.trim().length !== 2) e.state = "Use a sigla (ex.: SP).";
  return e;
}

// ---- Credit card (typed on our checkout; sent only to the payment gateway once it is connected) ----
export type CardForm = { number: string; holder: string; expiry: string; cvv: string };
export type CardErrors = Partial<Record<keyof CardForm, string>>;
export const emptyCard: CardForm = { number: "", holder: "", expiry: "", cvv: "" };

export function cardBrand(v: string): "visa" | "mastercard" | "amex" | "elo" | "hipercard" | null {
  const d = digits(v);
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return "elo";
  if (/^(606282|3841)/.test(d)) return "hipercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^4/.test(d)) return "visa";
  return null;
}

export function maskCardNumber(v: string) {
  const d = digits(v).slice(0, 19);
  if (cardBrand(d) === "amex") return d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function maskExpiry(v: string) {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export const maskCvv = (v: string) => digits(v).slice(0, 4);

export function isValidCardNumber(v: string) {
  const d = digits(v);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(v: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const current = now.getFullYear() * 12 + now.getMonth();
  const card = year * 12 + (month - 1);
  return card >= current && card <= current + 20 * 12;
}

export const CARD_MASKS: Partial<Record<keyof CardForm, (v: string) => string>> = {
  number: maskCardNumber,
  expiry: maskExpiry,
  cvv: maskCvv,
  holder: (v) => v.replace(/[^a-zà-ÿ\s]/gi, "").toUpperCase().slice(0, 60),
};

export function validateCard(c: CardForm, now = new Date()): CardErrors {
  const e: CardErrors = {};
  if (!isValidCardNumber(c.number)) e.number = "Confira o número do cartão.";
  if (c.holder.trim().split(/\s+/).filter(Boolean).length < 2) e.holder = "Digite o nome como está no cartão.";
  if (!isValidExpiry(c.expiry, now)) e.expiry = "Validade inválida (MM/AA).";
  const cvvLen = cardBrand(c.number) === "amex" ? 4 : 3;
  if (digits(c.cvv).length !== cvvLen) e.cvv = `Digite os ${cvvLen} números do código.`;
  return e;
}

// Typed access to the store's cart rules (public/cart/cart-core.js) and the cart saved by the drawer.
// @ts-expect-error plain browser module without type declarations
import * as core from "../../public/cart/cart-core.js";

export type Kit = {
  id: string;
  option: string;
  title: string;
  packs: number;
  dose: string;
  price: number;
  oldPrice: number;
  image: string;
};
export type CartItem = { id: string; qty: number };
export type CartLine = CartItem & { kit: Kit };
export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  oldSubtotal: number;
  discount: number;
  freeShipping: boolean;
  remainingForFree: number;
  progress: number;
  shipping: number | null;
  total: number;
  installment: number;
};
export type PixResult = {
  transaction: string | null;
  code: string;
  amount: number;
  status: string;
  pix: string;
  qrImage?: string;
  qrSvg?: string;
  expiresAt?: string | null;
  email?: string;
  createdAt: number;
};
export type CartState = { items: CartItem[]; coupon: string | null; cep: string; pix: PixResult | null };

type Core = {
  KITS: Kit[];
  BUMP: Kit;
  MAX_INSTALLMENTS: number;
  COUPONS: Record<string, number>;
  PRODUCT_NAME: string;
  FREE_SHIPPING_MIN: number;
  findKit: (id: string) => Kit | null;
  addItem: (items: CartItem[], id: string, qty?: number) => CartItem[];
  setQty: (items: CartItem[], id: string, qty: number) => CartItem[];
  normalizeCoupon: (code: unknown) => string | null;
  isValidCep: (v: unknown) => boolean;
  isValidCpf: (v: unknown) => boolean;
  isValidPhone: (v: unknown) => boolean;
  summarize: (items: CartItem[], opts?: { coupon?: string | null; cep?: string | null }) => CartSummary;
  formatBRL: (n: number) => string;
};

const c = core as Core;
export const { KITS, BUMP, MAX_INSTALLMENTS, COUPONS, PRODUCT_NAME, FREE_SHIPPING_MIN } = c;
export const { findKit, addItem, setQty, normalizeCoupon, isValidCep, isValidCpf, isValidPhone, summarize, formatBRL } = c;

// Small (160px) copies of the kit photos in public/images/thumbs/, for the checkout's order summary.
export const thumb = (src: string) => src.replace("/images/", "/images/thumbs/");

// Same storage keys and shape as the cart drawer (public/cart/ps-cart.js).
const STORAGE_KEY = "ps-cart-v1";
const TRACKING_KEY = "ps-tracking-v1";
const PIX_TTL_MS = 60 * 60 * 1000;

export function loadCart(): CartState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const pix = s.pix && s.pix.pix && Date.now() - (s.pix.createdAt || 0) < PIX_TTL_MS ? s.pix : null;
    return { items: Array.isArray(s.items) ? s.items : [], coupon: normalizeCoupon(s.coupon), cep: s.cep || "", pix };
  } catch {
    return { items: [], coupon: null, cep: "", pix: null };
  }
}

export function saveCart(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked */
  }
}

export function readTracking(): Record<string, string> {
  try {
    const q = new URLSearchParams(location.search);
    const keys = ["src", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const found = Object.fromEntries(keys.filter((k) => q.get(k)).map((k) => [k, (q.get(k) || "").slice(0, 200)]));
    if (Object.keys(found).length) sessionStorage.setItem(TRACKING_KEY, JSON.stringify(found));
    return JSON.parse(sessionStorage.getItem(TRACKING_KEY) || "{}");
  } catch {
    return {};
  }
}

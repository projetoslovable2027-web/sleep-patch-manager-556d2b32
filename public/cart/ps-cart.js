// Patch Sleep cart drawer: replaces the original store's cart (which depended on a checkout that no longer exists).
import { KITS, PRODUCT_NAME, findKit, addItem, setQty, summarize, formatBRL, normalizeCoupon, isValidCep, COUPONS, FREE_SHIPPING_MIN } from "./cart-core.js";

const STORAGE_KEY = "ps-cart-v1";
const PIX_TTL_MS = 60 * 60 * 1000;
const TRACKING_KEY = "ps-tracking-v1";
const UPSELL_ID = "kit-1";

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const pix = s.pix && s.pix.pix && Date.now() - (s.pix.createdAt || 0) < PIX_TTL_MS ? s.pix : null;
    return { items: Array.isArray(s.items) ? s.items : [], coupon: normalizeCoupon(s.coupon), cep: s.cep || "", pix };
  } catch {
    return { items: [], coupon: null, cep: "", pix: null };
  }
};
let state = load();
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (k) => Math.round((1 - k.price / k.oldPrice) * 100);

const ICON = {
  close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  cart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20 8H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/><path d="M12 9.5v3M10.5 11h3"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  pix: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.8l4.2 4.2-4.2 4.2L7.8 7zM12 12.8l4.2 4.2-4.2 4.2L7.8 17zM2.8 12L7 7.8l4.2 4.2L7 16.2zM12.8 12L17 7.8l4.2 4.2-4.2 4.2z"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  coupon: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 15l6-6"/><circle cx="9.3" cy="9.3" r=".8"/><circle cx="14.7" cy="14.7" r=".8"/></svg>',
};

let root, ui = { view: "cart", freteOpen: false, cupomOpen: false, couponError: "", cepError: "", copied: false };

function build() {
  root = document.createElement("div");
  root.className = "psc";
  root.innerHTML = `
    <div class="psc-overlay" data-psc="close"></div>
    <aside class="psc-drawer" role="dialog" aria-modal="true" aria-label="Carrinho de compras" tabindex="-1">
      <div class="psc-header">
        <button type="button" class="psc-back" data-psc="back" aria-label="Voltar ao carrinho" hidden>${ICON.back}</button>
        <h2 class="psc-title">Carrinho de compras</h2>
        <button type="button" class="psc-close" data-psc="close" aria-label="Fechar carrinho">${ICON.close}</button>
      </div>
      <div class="psc-body"></div>
      <div class="psc-footer"></div>
    </aside>`;
  document.body.appendChild(root);
  root.addEventListener("click", onDrawerClick);
  root.addEventListener("submit", onDrawerSubmit);
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.name === "cep") {
      let v = t.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
      t.value = v;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("is-open")) close(); });
}

function setHeader(title, showBack) {
  root.querySelector(".psc-title").textContent = title;
  root.querySelector(".psc-back").hidden = !showBack;
}

function render() {
  if (state.pix) return renderPix();
  ui.view = "cart";
  setHeader("Carrinho de compras", false);
  const s = summarize(state.items, { coupon: state.coupon, cep: state.cep });
  const body = root.querySelector(".psc-body");
  const footer = root.querySelector(".psc-footer");

  const barMsg = s.count === 0
    ? `Faltam ${formatBRL(FREE_SHIPPING_MIN)} para o frete grátis`
    : s.freeShipping ? "Você ganhou Frete Grátis!" : `Faltam ${formatBRL(s.remainingForFree)} para o frete grátis`;
  const bar = `
    <div class="psc-progress">
      <p class="psc-progress-msg">${barMsg}</p>
      <div class="psc-progress-track"><div class="psc-progress-fill" style="width:${Math.max(s.count ? 4 : 0, s.progress * 100)}%"></div><span class="psc-progress-dot ${s.freeShipping ? "is-done" : ""}"></span></div>
    </div>`;

  if (s.count === 0) {
    body.innerHTML = bar + `
      <div class="psc-empty">
        <p>Seu carrinho está vazio.</p>
        <button type="button" class="psc-link" data-psc="close">Continuar comprando</button>
      </div>`;
    footer.innerHTML = "";
    footer.hidden = true;
    return;
  }
  footer.hidden = false;

  const items = s.lines.map(({ kit, qty }) => `
    <div class="psc-item">
      <img class="psc-item-img" src="${kit.image}" alt="${esc(PRODUCT_NAME)}" width="70" height="70">
      <div class="psc-item-info">
        <p class="psc-item-name">${esc(PRODUCT_NAME)}</p>
        <p class="psc-item-sub">(${esc(kit.title)} · ${esc(kit.dose)})</p>
        <div class="psc-qty">
          <button type="button" data-psc="dec" data-id="${kit.id}" aria-label="${qty === 1 ? "Remover" : "Diminuir quantidade"}">${qty === 1 ? ICON.trash : ICON.minus}</button>
          <span aria-live="polite">${qty}</span>
          <button type="button" data-psc="inc" data-id="${kit.id}" aria-label="Aumentar quantidade">${ICON.plus}</button>
        </div>
      </div>
      <div class="psc-item-side">
        <button type="button" class="psc-remove" data-psc="remove" data-id="${kit.id}" aria-label="Remover item">${ICON.x}</button>
        <span class="psc-old">${formatBRL(kit.oldPrice * qty)}</span>
        <span class="psc-price">${formatBRL(kit.price * qty)}</span>
      </div>
    </div>`).join("");

  const up = findKit(UPSELL_ID);
  const upsell = `
    <div class="psc-upsell">
      <div class="psc-upsell-head">Leve junto com <span class="psc-pill">${pct(up)}% OFF</span> !</div>
      <div class="psc-upsell-row">
        <img src="${up.image}" alt="" width="44" height="44">
        <div class="psc-upsell-info">
          <p class="psc-upsell-name">${esc(PRODUCT_NAME)} (${esc(up.title)})</p>
          <p><span class="psc-old">${formatBRL(up.oldPrice)}</span> <strong>${formatBRL(up.price)}</strong></p>
        </div>
        <button type="button" class="psc-upsell-add" data-psc="upsell" aria-label="Adicionar ${esc(up.title)} ao carrinho">${ICON.cart}</button>
        <button type="button" class="psc-upsell-next" data-psc="upsell" aria-label="Adicionar">${ICON.chev}</button>
      </div>
    </div>`;
  body.innerHTML = bar + `<div class="psc-items">${items}</div>` + upsell;

  const freteValue = s.freeShipping ? '<span class="psc-free">Grátis</span>'
    : s.shipping != null ? `<button type="button" class="psc-action" data-psc="frete">${formatBRL(s.shipping)} ${ICON.chev}</button>`
    : `<button type="button" class="psc-action" data-psc="frete">Calcule seu frete ${ICON.chev}</button>`;
  const freteForm = ui.freteOpen && !s.freeShipping ? `
    <form class="psc-inline" data-form="cep">
      <input name="cep" inputmode="numeric" placeholder="Digite seu CEP" value="${esc(state.cep ? state.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : "")}" aria-label="CEP">
      <button type="submit">Calcular</button>
    </form>${ui.cepError ? `<p class="psc-error">${ui.cepError}</p>` : ""}` : "";

  const cupomValue = state.coupon
    ? `<button type="button" class="psc-action" data-psc="rm-coupon">${esc(state.coupon)} (-${Math.round(COUPONS[state.coupon] * 100)}%) ${ICON.x}</button>`
    : `<button type="button" class="psc-action" data-psc="cupom">Adicione desconto ${ICON.chevDown}</button>`;
  const cupomForm = ui.cupomOpen && !state.coupon ? `
    <form class="psc-inline" data-form="coupon">
      <input name="coupon" placeholder="Código do cupom" autocapitalize="characters" aria-label="Cupom de desconto">
      <button type="submit">Aplicar</button>
    </form>${ui.couponError ? `<p class="psc-error">${ui.couponError}</p>` : ""}` : "";

  footer.innerHTML = `
    <div class="psc-row"><span class="psc-label">${ICON.truck} Frete</span>${freteValue}</div>
    ${freteForm}
    <div class="psc-row"><span class="psc-label">${ICON.coupon} Cupom</span>${cupomValue}</div>
    ${cupomForm}
    <div class="psc-totals">
      <div class="psc-sum"><span>SUBTOTAL</span><span>${formatBRL(s.subtotal)}</span></div>
      ${s.discount ? `<div class="psc-sum psc-sum-discount"><span>DESCONTO</span><span>- ${formatBRL(s.discount)}</span></div>` : ""}
      <div class="psc-total"><span>TOTAL</span><span>${formatBRL(s.total)}</span></div>
      <p class="psc-installments">Pagamento via Pix</p>
    </div>
    <button type="button" class="psc-checkout" data-psc="checkout">Finalizar compra</button>
    <button type="button" class="psc-link" data-psc="close">Continuar comprando</button>`;
}

function updateBadges() {
  const { count } = summarize(state.items);
  document.querySelectorAll(".js-cart-widget-amount").forEach((el) => { el.textContent = String(count); });
}

function commit() { save(); render(); updateBadges(); }

// Warm up the checkout page while the shopper looks at the cart, so "Finalizar compra" opens faster.
let checkoutPrefetched = false;
function prefetchCheckout() {
  if (checkoutPrefetched) return;
  checkoutPrefetched = true;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = "/checkout";
  document.head.appendChild(link);
}

function open() {
  render();
  prefetchCheckout();
  root.classList.add("is-open");
  document.documentElement.classList.add("psc-lock");
  setTimeout(() => root.querySelector(".psc-drawer").focus(), 50);
}
function close() {
  root.classList.remove("is-open");
  document.documentElement.classList.remove("psc-lock");
}

// ---- Pix waiting screen (order created on /checkout) ----
function renderPix() {
  setHeader("Pagamento via Pix", false);
  const p = state.pix;
  const body = root.querySelector(".psc-body");
  const footer = root.querySelector(".psc-footer");
  body.innerHTML = `
    <div class="psc-pix">
      <p class="psc-pix-lead">Pedido <strong>${esc(p.code)}</strong> criado! Pague o Pix para confirmar.</p>
      <p class="psc-pix-amount">${formatBRL(p.amount)}</p>
      <div class="psc-pix-qr" aria-label="QR Code do Pix">${p.qrSvg}</div>
      <ol class="psc-pix-steps">
        <li>Abra o app do seu banco e escolha <strong>Pix</strong>.</li>
        <li>Escaneie o QR Code ou use o <strong>Pix Copia e Cola</strong>.</li>
        <li>Confirme o pagamento. Você recebe a confirmação em <strong>${esc(p.email || "seu e-mail")}</strong>.</li>
      </ol>
      <label class="psc-field is-full"><span>Pix Copia e Cola</span>
        <textarea class="psc-pix-code" readonly rows="3">${esc(p.pix)}</textarea>
      </label>
    </div>`;
  footer.hidden = false;
  footer.innerHTML = `
    <button type="button" class="psc-checkout" data-psc="copy-pix">${ui.copied ? "Código copiado!" : "Copiar código Pix"}</button>
    <button type="button" class="psc-link" data-psc="pix-done">Voltar para a loja</button>`;
}

async function copyPix() {
  const code = state.pix?.pix || "";
  try { await navigator.clipboard.writeText(code); }
  catch {
    const ta = root.querySelector(".psc-pix-code");
    ta?.select();
    document.execCommand?.("copy");
  }
  ui.copied = true;
  renderPix();
  setTimeout(() => { ui.copied = false; if (state.pix) renderPix(); }, 2500);
}

function onDrawerClick(e) {
  const btn = e.target.closest("[data-psc]");
  if (!btn) return;
  const id = btn.dataset.id;
  const item = state.items.find((i) => i.id === id);
  switch (btn.dataset.psc) {
    case "close": close(); break;
    case "inc": state.items = setQty(state.items, id, (item?.qty || 0) + 1); commit(); break;
    case "dec": state.items = setQty(state.items, id, (item?.qty || 1) - 1); commit(); break;
    case "remove": state.items = setQty(state.items, id, 0); commit(); break;
    case "upsell": state.items = addItem(state.items, UPSELL_ID); commit(); break;
    case "frete": ui.freteOpen = !ui.freteOpen; ui.cepError = ""; render(); root.querySelector('[name="cep"]')?.focus(); break;
    case "cupom": ui.cupomOpen = !ui.cupomOpen; ui.couponError = ""; render(); root.querySelector('[name="coupon"]')?.focus(); break;
    case "rm-coupon": state.coupon = null; commit(); break;
    case "checkout": save(); location.href = "/checkout"; break;
    case "back": ui.view = "cart"; render(); break;
    case "copy-pix": copyPix(); break;
    case "pix-done": state.pix = null; ui.view = "cart"; save(); close(); render(); break;
  }
}

function onDrawerSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === "cep") {
    const cep = form.cep.value.replace(/\D/g, "");
    if (!isValidCep(cep)) { ui.cepError = "Digite um CEP válido com 8 números."; render(); return; }
    state.cep = cep; ui.freteOpen = false; ui.cepError = ""; commit();
  } else if (form.dataset.form === "coupon") {
    const code = normalizeCoupon(form.coupon.value);
    if (!code) { ui.couponError = "Cupom inválido."; render(); return; }
    state.coupon = code; ui.cupomOpen = false; ui.couponError = ""; commit();
  }
}

function selectedKitId() {
  const opt = document.querySelector(".gummy-product__variation-option.selected")?.dataset.option
    || document.querySelector("#variation_1")?.value;
  return (findKit(opt) || KITS[0]).id;
}

function saveTracking() {
  try {
    const q = new URLSearchParams(location.search);
    const keys = ["src", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const found = Object.fromEntries(keys.filter((k) => q.get(k)).map((k) => [k, q.get(k).slice(0, 200)]));
    if (Object.keys(found).length) sessionStorage.setItem(TRACKING_KEY, JSON.stringify(found));
  } catch {}
}

function init() {
  saveTracking();
  build();
  render();
  updateBadges();
  // The original store scripts reset the badge after they load; set it again.
  setTimeout(updateBadges, 1500);
  setTimeout(updateBadges, 4000);

  // Capture phase on window so the original store's add-to-cart handlers never run.
  window.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || root.contains(t)) return;
    const buy = t.closest(".js-addtocart:not(.js-addtocart-placeholder), .js-prod-submit-form");
    if (buy) {
      e.preventDefault();
      e.stopImmediatePropagation();
      state.items = addItem(state.items, selectedKitId());
      commit();
      open();
      return;
    }
    const cartBtn = t.closest('[data-toggle="#modal-cart"], [data-target="#modal-cart"], #ajax-cart a');
    if (cartBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      document.querySelectorAll(".js-modal.modal-show, #modal-cart").forEach((m) => { if (m.id !== "modal-cart") return; m.style.display = "none"; });
      open();
    }
  }, true);

  window.addEventListener("submit", (e) => {
    const f = e.target;
    if (f instanceof HTMLFormElement && !root.contains(f) && (f.id === "product_form" || f.querySelector(".js-addtocart") || f.getAttribute("action") === "/comprar/")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

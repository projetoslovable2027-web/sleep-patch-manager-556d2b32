// Serves the store's original HTML pages (copied verbatim from the source site) as raw responses.
const pages = {
  index: () => import("@/site/index.html?raw"),
  garantia: () => import("@/site/garantia.html?raw"),
  "perguntas-frequentes": () => import("@/site/perguntas-frequentes.html?raw"),
  "politica-de-privacidade": () => import("@/site/politica-de-privacidade.html?raw"),
  "termos-e-condicoes": () => import("@/site/termos-e-condicoes.html?raw"),
  "seja-uma-influencer": () => import("@/site/seja-uma-influencer.html?raw"),
  "seja-um-revendedor": () => import("@/site/seja-um-revendedor.html?raw"),
  rastreio: () => import("@/site/rastreio.html?raw"),
} as const;

export type PageName = keyof typeof pages;

// Our own cart drawer replaces the original store cart on every page.
const CART_TAGS =
  '<link rel="stylesheet" href="/cart/ps-cart.css"><script type="module" src="/cart/ps-cart.js"></script>';

export function injectCart(html: string): string {
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + CART_TAGS : html.slice(0, i) + CART_TAGS + html.slice(i);
}

export async function servePage(name: PageName): Promise<Response> {
  const mod = await pages[name]();
  return new Response(injectCart(mod.default), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function pageRoute(name: PageName) {
  return { handlers: { GET: () => servePage(name) } };
}

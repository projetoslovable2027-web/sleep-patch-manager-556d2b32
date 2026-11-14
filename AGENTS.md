<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Store pages are the original HTML files in `src/site/`, served raw by route server handlers via `src/lib/static-page.ts`; their CSS/JS/images/fonts/media live in `public/` at the same paths the HTML references. Why: the site is a verbatim copy of an existing store and must render identically.
- The splat route `$.tsx` returns the home page for unknown paths. Why: mirrors the original server's catch-all fallback.
- The cart is our own drawer (`public/cart/`), injected into every page by `injectCart` in `src/lib/static-page.ts`; it intercepts the original store's buy/cart clicks in the capture phase and stores the cart in localStorage. Pricing/coupon/shipping rules live in `public/cart/cart-core.js` and are tested in `src/test/cart-rules.test.ts`. Why: the original store's cart and checkout backend is not available here.
- Checkout is our own React page `/checkout` (3 steps + order summary, styled with the store's tokens in `src/styles.css`); the drawer's "Finalizar compra" navigates there, and it shares the drawer's localStorage cart through `src/lib/cart.ts`. Form masks/validation live in `src/lib/checkout-form.ts` (tested). Why: the whole purchase happens on our site, with no external checkout.
- Payments go through our server route `src/routes/api/public/payment.ts`, which validates the order and recomputes prices with `buildOrder` from `cart-core.js` (cents), then creates the Pix sale on BlackCat (body built by `src/lib/blackcat.ts`, tested; API key in the `STRIPE_LIVE_API_KEY` secret, read only on the server). The Pix screen polls `src/routes/api/public/payment-status.ts`, which returns only the status. Card answers 503 until a PCI-safe card flow is chosen. The order bump is `BUMP` in `cart-core.js` (cart item `bump-1`, max 1, needs a kit), so the server prices it too. Why: the browser must never set prices or see gateway keys.
- Card fields (number, holder, expiry, CVV) are typed on `/checkout`, validated by `validateCard` in `src/lib/checkout-form.ts`, kept in React state only and never sent to our server raw; the gateway's own browser tokenization must turn them into a token. Why: avoids handling raw card data (PCI).
- The checkout imports icons from `src/components/checkout/icons.tsx` (inline lucide copies), shows order-summary photos from `public/images/thumbs/`, and renders its form on the server with a placeholder summary until the saved cart is read. Why: keeps `/checkout` fast to open; don't import `lucide-react` or full-size photos there.

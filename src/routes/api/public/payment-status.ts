import { createFileRoute } from "@tanstack/react-router";

// Tells the Pix screen whether its payment was confirmed. Only the status is returned.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/payment-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") || "";
        if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return json({ error: "Pedido inválido." }, 400);
        const apiKey = process.env['STRIPE_LIVE_API_KEY'];
        if (!apiKey) return json({ error: "Pagamentos indisponíveis." }, 503);
        try {
          const res = await fetch(`https://api.blackcatoficial.com/api/sales/${encodeURIComponent(id)}/status`, { headers: { "X-API-Key": apiKey } });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.success) return json({ error: "Não encontrado." }, res.status === 404 ? 404 : 424);
          return json({ status: String(data.data?.status || "PENDING").toUpperCase() });
        } catch {
          return json({ error: "Tente novamente." }, 424);
        }
      },
    },
  },
});

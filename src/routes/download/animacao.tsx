import { createFileRoute } from "@tanstack/react-router";

const VIDEO_PATH = "/media/night-coracao.mp4";

export const Route = createFileRoute("/download/animacao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(VIDEO_PATH, request.url);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`status ${res.status}`);
          return new Response(res.body, {
            headers: {
              "content-type": "video/mp4",
              "content-disposition": 'attachment; filename="animacao-produto-night-coracao.mp4"',
            },
          });
        } catch {
          return Response.redirect(url.toString(), 302);
        }
      },
    },
  },
});

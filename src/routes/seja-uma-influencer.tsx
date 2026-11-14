import { createFileRoute } from "@tanstack/react-router";
import { pageRoute } from "@/lib/static-page";

export const Route = createFileRoute("/seja-uma-influencer")({
  server: pageRoute("seja-uma-influencer"),
});

import { createFileRoute } from "@tanstack/react-router";
import { pageRoute } from "@/lib/static-page";

export const Route = createFileRoute("/politica-de-privacidade")({
  server: pageRoute("politica-de-privacidade"),
});

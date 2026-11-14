import { createFileRoute } from "@tanstack/react-router";
import { pageRoute } from "@/lib/static-page";

export const Route = createFileRoute("/garantia-gummy")({
  server: pageRoute("garantia"),
});

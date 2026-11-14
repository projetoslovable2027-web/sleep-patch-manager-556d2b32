import { createFileRoute } from "@tanstack/react-router";
import { pageRoute } from "@/lib/static-page";

export const Route = createFileRoute("/termos-e-condicoes")({
  server: pageRoute("termos-e-condicoes"),
});

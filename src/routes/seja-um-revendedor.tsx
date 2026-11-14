import { createFileRoute } from "@tanstack/react-router";
import { pageRoute } from "@/lib/static-page";

export const Route = createFileRoute("/seja-um-revendedor")({
  server: pageRoute("seja-um-revendedor"),
});

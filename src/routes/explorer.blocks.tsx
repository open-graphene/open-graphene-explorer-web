import { createFileRoute } from "@tanstack/react-router";
import { BlocksPage } from "../features/blocks/BlocksPage";

export const Route = createFileRoute("/explorer/blocks")({
  component: BlocksPage,
});

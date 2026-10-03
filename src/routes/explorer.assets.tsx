import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { AssetsPage } from "../features/assets/AssetsPage";
import {
  defaultAssetSearch,
  validateAssetSearch,
} from "../features/assets/search";

export const Route = createFileRoute("/explorer/assets")({
  validateSearch: validateAssetSearch,
  search: { middlewares: [stripSearchParams(defaultAssetSearch)] },
  component: AssetsPage,
});

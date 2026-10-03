import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { WitnessesPage } from "../features/witnesses/WitnessesPage";
import {
  defaultWitnessSearch,
  validateWitnessSearch,
} from "../features/witnesses/model";
export const Route = createFileRoute("/explorer/witnesses")({
  validateSearch: validateWitnessSearch,
  search: { middlewares: [stripSearchParams(defaultWitnessSearch)] },
  component: WitnessesPage,
});

import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { AccountsPage } from "../features/accounts/AccountsPage";
import {
  defaultAccountSearch,
  validateAccountSearch,
} from "../features/accounts/search";

export const Route = createFileRoute("/explorer/accounts")({
  validateSearch: validateAccountSearch,
  search: { middlewares: [stripSearchParams(defaultAccountSearch)] },
  component: AccountsPage,
});

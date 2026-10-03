import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { AccountPage } from "../features/account/AccountPage";
import {
  defaultAccountDetailSearch,
  validateAccountDetailSearch,
} from "../features/account/search";
export const Route = createFileRoute("/account/$accountName")({
  validateSearch: validateAccountDetailSearch,
  search: { middlewares: [stripSearchParams(defaultAccountDetailSearch)] },
  component: AccountPage,
});

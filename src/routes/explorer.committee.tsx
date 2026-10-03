import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { CommitteePage } from "../features/committee/CommitteePage";
import {
  defaultCommitteeSearch,
  validateCommitteeSearch,
} from "../features/committee/model";
export const Route = createFileRoute("/explorer/committee")({
  validateSearch: validateCommitteeSearch,
  search: { middlewares: [stripSearchParams(defaultCommitteeSearch)] },
  component: CommitteePage,
});

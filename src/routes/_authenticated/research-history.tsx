import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/ResearchWorkspace";
import { workspaceQueryOptions, workspaceHead, workspaceSearch } from "@/lib/workspace-data";

export const Route = createFileRoute("/_authenticated/research-history")({
  validateSearch: workspaceSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions),
  head: () => workspaceHead("Research History", "Explore your saved research in Meridian: research history."),
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
  component: () => <ResearchWorkspace view="history" />,
});

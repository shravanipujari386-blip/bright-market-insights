import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/ResearchWorkspace";
import { workspaceQueryOptions, workspaceHead, workspaceSearch } from "@/lib/workspace-data";

export const Route = createFileRoute("/_authenticated/competitor-analysis")({
  validateSearch: workspaceSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions),
  head: () => workspaceHead("Competitor Analysis", "Explore your saved research in Meridian: competitor analysis."),
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
  component: () => <ResearchWorkspace view="competitors" />,
});

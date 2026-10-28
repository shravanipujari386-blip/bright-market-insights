import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/ResearchWorkspace";
import { workspaceQueryOptions, workspaceHead, workspaceSearch } from "@/lib/workspace-data";

export const Route = createFileRoute("/_authenticated/market-analysis")({
  validateSearch: workspaceSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions),
  head: () => workspaceHead("Market Analysis", "Explore your saved research in Meridian: market analysis."),
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
  component: () => <ResearchWorkspace view="market" />,
});

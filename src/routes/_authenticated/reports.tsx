import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/ResearchWorkspace";
import { workspaceQueryOptions, workspaceHead, workspaceSearch } from "@/lib/workspace-data";

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: workspaceSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions),
  head: () => workspaceHead("Reports", "Explore your saved research in Meridian: reports."),
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
  component: () => <ResearchWorkspace view="reports" />,
});

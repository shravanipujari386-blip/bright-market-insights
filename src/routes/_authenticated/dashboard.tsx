import { createFileRoute } from "@tanstack/react-router";
import { ResearchWorkspace, WorkspaceError, WorkspaceNotFound } from "@/components/ResearchWorkspace";
import { workspaceQueryOptions, workspaceHead, workspaceSearch } from "@/lib/workspace-data";
export const Route = createFileRoute("/_authenticated/dashboard")({
 validateSearch: workspaceSearch,
 loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions),
 head: () => workspaceHead("Overview", "Your Meridian research overview, latest reports and market insights."),
 errorComponent: WorkspaceError,
 notFoundComponent: WorkspaceNotFound,
 component: () => <ResearchWorkspace view="overview" />,
});

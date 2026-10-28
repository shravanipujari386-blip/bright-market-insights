import { createFileRoute } from "@tanstack/react-router";
import { NewResearch } from "@/components/NewResearch";
import { workspaceHead } from "@/lib/workspace-data";
export const Route = createFileRoute("/_authenticated/new-research")({
 head: () => workspaceHead("New Research", "Start a cited market research report with Meridian."),
 component: NewResearch,
});

import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/AccountSettings";
import { workspaceHead } from "@/lib/workspace-data";
export const Route = createFileRoute("/_authenticated/settings")({
 head: () => workspaceHead("Settings", "Manage your Meridian profile, account security and research history."),
 component: AccountSettings,
});

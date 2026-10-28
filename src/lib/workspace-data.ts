import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Analysis, Plan, Review, SourcesPayload } from "./research-types";

export type SavedReport = Tables<"research_reports">;
export const workspaceQueryOptions = queryOptions({
  queryKey: ["reports", "workspace"],
  queryFn: async () => {
    const { data, error } = await supabase.from("research_reports").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export function reportData(report?: SavedReport) {
  return {
    plan: (report?.plan as Plan | null) ?? null,
    analysis: (report?.analysis as Analysis | null) ?? null,
    review: (report?.review as Review | null) ?? null,
    sources: (report?.sources as SourcesPayload | null)?.items ?? [],
  };
}

export function metricGroups(analysis: Analysis | null) {
  const groups = new Map<string, NonNullable<Analysis>["market_metrics"]>();
  for (const metric of analysis?.market_metrics ?? []) {
    if (metric.numeric_value === null || !Number.isFinite(metric.numeric_value) || !metric.unit || !metric.source_ids.length) continue;
    const key = `${metric.label} · ${metric.unit}`;
    const group = groups.get(key) ?? [];
    group.push(metric);
    groups.set(key, group);
  }
  return Array.from(groups, ([label, metrics]) => ({ label, metrics }));
}

export function workspaceHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Meridian` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Meridian` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}

export const workspaceSearch = (s: Record<string, unknown>) => ({
  report: typeof s.report === "string" ? s.report : "",
  q: typeof s.q === "string" ? s.q : "",
  status: typeof s.status === "string" ? s.status : "all",
});
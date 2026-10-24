import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { Analysis, Plan, SourcesPayload, StageEntry } from "./research-types";

type Ctx = { supabase: any; userId: string };

async function load(ctx: Ctx, id: string) {
  const { data, error } = await ctx.supabase.from("research_reports").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Report not found");
  return data;
}

async function update(ctx: Ctx, id: string, patch: Record<string, unknown>, entry?: StageEntry, prevLog?: Json) {
  const log = Array.isArray(prevLog) ? [...(prevLog as StageEntry[])] : [];
  if (entry) log.push(entry);
  const { error } = await ctx.supabase
    .from("research_reports")
    .update({ ...patch, stage_log: log, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Could not save report progress");
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : "Unexpected error";
}

const idInput = (d: unknown) => z.object({ id: z.string().uuid() }).parse(d);

export const startResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().trim().min(10).max(600) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("research_reports")
      .insert({ user_id: context.userId, query: data.query, status: "planning" })
      .select("id")
      .single();
    if (error || !row) throw new Error("Could not create report");
    const { planQuery } = await import("./agents.server");
    try {
      const plan = await planQuery(data.query);
      const status = plan.needs_clarification ? "clarify" : "searching";
      await update(context, row.id, { plan: plan as unknown as Json, status }, {
        stage: "planning",
        status: "done",
        at: new Date().toISOString(),
      });
      return { id: row.id, status };
    } catch (e) {
      await update(context, row.id, { status: "failed", error: msg(e) }, {
        stage: "planning",
        status: "failed",
        at: new Date().toISOString(),
        detail: msg(e),
      });
      return { id: row.id, status: "failed" };
    }
  });

export const runSearchStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const r = await load(context, data.id);
    const plan = r.plan as Plan;
    const { searchSources } = await import("./agents.server");
    try {
      const { sources, failures } = await searchSources(plan.search_queries);
      if (sources.length === 0) throw new Error(`Live search returned no usable sources. ${failures.join("; ")}`);
      await update(
        context,
        data.id,
        { sources: { items: sources, failures } as unknown as Json, status: "analyzing" },
        { stage: "searching", status: "done", at: new Date().toISOString(), detail: `${sources.length} sources` },
        r.stage_log,
      );
      return { status: "analyzing" };
    } catch (e) {
      await update(context, data.id, { status: "failed", error: msg(e) },
        { stage: "searching", status: "failed", at: new Date().toISOString(), detail: msg(e) }, r.stage_log);
      return { status: "failed" };
    }
  });

export const runAnalysisStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const r = await load(context, data.id);
    const { analyze } = await import("./agents.server");
    try {
      const a = await analyze(r.query, r.plan as Plan, (r.sources as SourcesPayload).items);
      await update(context, data.id, { analysis: a as unknown as Json, status: "reviewing" },
        { stage: "analyzing", status: "done", at: new Date().toISOString() }, r.stage_log);
      return { status: "reviewing" };
    } catch (e) {
      await update(context, data.id, { status: "failed", error: msg(e) },
        { stage: "analyzing", status: "failed", at: new Date().toISOString(), detail: msg(e) }, r.stage_log);
      return { status: "failed" };
    }
  });

export const runReviewStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const r = await load(context, data.id);
    const { review } = await import("./agents.server");
    try {
      const rv = await review(r.query, r.analysis as Analysis, (r.sources as SourcesPayload).items);
      await update(context, data.id, { review: rv as unknown as Json, status: "complete" },
        { stage: "reviewing", status: "done", at: new Date().toISOString() }, r.stage_log);
      return { status: "complete" };
    } catch (e) {
      await update(context, data.id, { status: "failed", error: msg(e) },
        { stage: "reviewing", status: "failed", at: new Date().toISOString(), detail: msg(e) }, r.stage_log);
      return { status: "failed" };
    }
  });

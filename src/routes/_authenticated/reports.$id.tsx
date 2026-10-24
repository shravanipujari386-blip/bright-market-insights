import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Download, ExternalLink, Loader2, X, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runSearchStage, runAnalysisStage, runReviewStage } from "@/lib/research.functions";
import { STAGES, type Analysis, type Plan, type Review, type SourcesPayload, type StageEntry } from "@/lib/research-types";
import { exportCsv, exportPdf } from "@/lib/exports";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({
    meta: [
      { title: "Research report — Meridian" },
      { name: "description", content: "AI market research report with verified, cited findings." },
      { property: "og:title", content: "Research report — Meridian" },
      { property: "og:description", content: "AI market research report with verified, cited findings." },
    ],
  }),
  component: ReportPage,
});

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ReportPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("research_reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const search = useServerFn(runSearchStage);
  const analyze = useServerFn(runAnalysisStage);
  const review = useServerFn(runReviewStage);
  const running = useRef<string | null>(null);
  const [netErr, setNetErr] = useState<string | null>(null);

  const status = q.data?.status;
  useEffect(() => {
    if (!status || running.current === status) return;
    const fn = status === "searching" ? search : status === "analyzing" ? analyze : status === "reviewing" ? review : null;
    if (!fn) return;
    running.current = status;
    fn({ data: { id } })
      .catch((e) => setNetErr(e instanceof Error ? e.message : "Connection lost during this stage"))
      .finally(() => q.refetch());
  }, [status, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (q.isLoading) return <Center><Loader2 className="h-6 w-6 animate-spin" /></Center>;
  if (!q.data) return <Center>Report not found.</Center>;

  const r = q.data;
  const plan = r.plan as Plan | null;
  const src = (r.sources as SourcesPayload | null) ?? { items: [], failures: [] };
  const analysis = r.analysis as Analysis | null;
  const rev = r.review as Review | null;
  const log = (r.stage_log as StageEntry[]) ?? [];
  const inProgress = ["planning", "searching", "analyzing", "reviewing"].includes(r.status);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All research
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3"><p className="eyebrow">Research report</p><StatusBadge status={r.status} /></div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">{r.query}</h1>
        </div>
        {(analysis || rev) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(r.query, analysis, rev, src.items)}><Download className="h-4 w-4" /> CSV</Button>
            <Button size="sm" onClick={() => exportPdf(r.query, analysis, rev, src.items)}><Download className="h-4 w-4" /> PDF</Button>
          </div>
        )}
      </div>

      <Pipeline status={r.status} log={log} />

      {r.status === "failed" && (
        <Notice tone="error" title="Research stopped">
          {r.error} {analysis ? "Completed stages are preserved below." : ""}
        </Notice>
      )}
      {netErr && inProgress && <Notice tone="error" title="Connection problem">{netErr}. Refresh the page to resume.</Notice>}
      {r.status === "clarify" && plan && (
        <Notice tone="warn" title="More detail needed">
          {plan.clarification_question} <Link to="/dashboard" className="underline">Ask a more specific question</Link>.
        </Notice>
      )}

      {plan && <PlanCard plan={plan} />}

      {analysis && (
        <>
          <section className="rule-top mt-10 pt-6">
            <p className="eyebrow">Executive summary</p>
            <p className="mt-3 max-w-4xl font-display text-xl leading-relaxed">{analysis.executive_summary}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Sources analysed" value={src.items.length} />
              <Stat label="Trends" value={analysis.trends.length} />
              <Stat label="Competitors" value={analysis.competitors.length} />
              <Stat label="Confidence" value={rev?.overall_confidence ?? "—"} />
            </div>
          </section>
          <Charts analysis={analysis} review={rev} sources={src.items} />
          <Tabs defaultValue="trends" className="mt-10">
            <TabsList className="flex-wrap">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="market">Market size</TabsTrigger>
              <TabsTrigger value="verify">Verification</TabsTrigger>
              <TabsTrigger value="sources">Sources ({src.items.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="trends" className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.trends.map((t) => (
                <Card key={t.title}><h3 className="text-lg font-semibold">{t.title}</h3><p className="mt-1 text-sm">{t.description}</p><p className="mt-2 text-xs text-muted-foreground">Impact: {t.impact}</p><Cites ids={t.source_ids} sources={src.items} /></Card>
              ))}
              <ListCard title="Opportunities" items={analysis.opportunities} sources={src.items} />
              <ListCard title="Risks & challenges" items={analysis.risks} sources={src.items} />
            </TabsContent>
            <TabsContent value="competitors" className="mt-4 overflow-x-auto">
              <table className="w-full rounded-lg border bg-card text-sm">
                <thead className="bg-muted text-left"><tr><th className="p-3">Company</th><th className="p-3">Overview</th><th className="p-3">Strengths</th><th className="p-3">Weaknesses</th><th className="p-3">Sources</th></tr></thead>
                <tbody className="divide-y">
                  {analysis.competitors.map((c) => (
                    <tr key={c.name} className="align-top"><td className="p-3 font-semibold">{c.name}</td><td className="p-3">{c.description}</td><td className="p-3">{c.strengths}</td><td className="p-3">{c.weaknesses}</td><td className="p-3"><Cites ids={c.source_ids} sources={src.items} /></td></tr>
                  ))}
                </tbody>
              </table>
              {analysis.competitors.length === 0 && <p className="text-sm text-muted-foreground">No competitor evidence found in the sources.</p>}
            </TabsContent>
            <TabsContent value="customers" className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.segments.map((s) => (<Card key={s.name}><h3 className="text-lg font-semibold">{s.name}</h3><p className="mt-1 text-sm">{s.description}</p><Cites ids={s.source_ids} sources={src.items} /></Card>))}
              {analysis.segments.length === 0 && <p className="text-sm text-muted-foreground">No customer segment evidence found.</p>}
            </TabsContent>
            <TabsContent value="market" className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.market_metrics.map((m, i) => (<Card key={i}><p className="eyebrow">{m.label}{m.year ? ` · ${m.year}` : ""}</p><p className="mt-2 font-display text-2xl">{m.value_text}</p><Cites ids={m.source_ids} sources={src.items} /></Card>))}
              {analysis.market_metrics.length === 0 && <p className="text-sm text-muted-foreground">No market size figures were stated in the retrieved sources.</p>}
            </TabsContent>
            <TabsContent value="verify" className="mt-4 space-y-3">
              {!rev && <p className="text-sm text-muted-foreground">{inProgress ? "Verification in progress…" : "Verification did not complete."}</p>}
              {rev && (
                <>
                  <Card><p className="eyebrow">Overall confidence: {rev.overall_confidence}</p><p className="mt-2 text-sm">{rev.confidence_reason}</p></Card>
                  {rev.claims.map((c, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border bg-card p-4">
                      <ClaimIcon s={c.status} />
                      <div className="flex-1"><p className="text-sm font-medium">{c.claim}</p><p className="mt-1 text-xs text-muted-foreground">{c.note}</p><Cites ids={c.source_ids} sources={src.items} /></div>
                    </div>
                  ))}
                  <Card><h3 className="text-lg font-semibold">Recommendations</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{rev.recommendations.map((x) => <li key={x}>{x}</li>)}</ul><p className="mt-4 text-sm">{rev.conclusion}</p></Card>
                </>
              )}
            </TabsContent>
            <TabsContent value="sources" className="mt-4">
              <ol className="divide-y rounded-lg border bg-card">
                {src.items.map((s) => (
                  <li key={s.id} id={`src-${s.id}`} className="p-4">
                    <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 font-medium hover:text-accent">
                      <span className="font-mono text-xs text-muted-foreground">[{s.id}]</span>{s.title}<ExternalLink className="mt-1 h-3 w-3 shrink-0" />
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">{s.domain}{s.published ? ` · ${s.published}` : ""}</p>
                    <p className="mt-2 line-clamp-3 text-sm">{s.snippet}</p>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
          {(analysis.limitations.length > 0 || src.failures.length > 0) && (
            <section className="mt-10 rounded-lg border border-warning/50 bg-warning/10 p-5">
              <h2 className="text-xl font-semibold">Limitations</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {analysis.limitations.map((l) => <li key={l}>{l}</li>)}
                {src.failures.map((f) => <li key={f}>Search query failed: {f}</li>)}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">AI-generated preliminary research. Verify important figures with the cited sources before making decisions.</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Pipeline({ status, log }: { status: string; log: StageEntry[] }) {
  const order = STAGES.map((s) => s.key);
  const cur = order.indexOf(status);
  return (
    <ol className="mt-6 grid gap-2 md:grid-cols-4">
      {STAGES.map((s, i) => {
        const entry = log.find((l) => l.stage === s.key);
        const state = entry?.status === "failed" ? "failed" : entry?.status === "done" ? "done" : i === cur ? "active" : "idle";
        return (
          <li key={s.key} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border">
              {state === "done" ? <Check className="h-4 w-4 text-success" /> : state === "failed" ? <X className="h-4 w-4 text-destructive" /> : state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <span className="font-mono text-xs">{i + 1}</span>}
            </span>
            <div className="min-w-0"><p className="text-sm font-medium">{s.label}</p>{entry?.detail && <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>}</div>
          </li>
        );
      })}
    </ol>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const facts = [["Industry", plan.industry], ["Product", plan.product], ["Geography", plan.geography], ["Period", plan.time_period], ["Audience", plan.audience]].filter(([, v]) => v);
  return (
    <details className="mt-6 rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">Research plan · {plan.search_queries.length} search queries</summary>
      <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
        <div>{facts.map(([k, v]) => <p key={k}><span className="text-muted-foreground">{k}:</span> {v}</p>)}<p className="mt-2 text-muted-foreground">Categories: {plan.categories.join(", ")}</p></div>
        <div><ul className="list-disc pl-5">{plan.search_queries.map((s) => <li key={s}>{s}</li>)}</ul>{plan.assumptions.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Assumptions: {plan.assumptions.join("; ")}</p>}</div>
      </div>
    </details>
  );
}

function Charts({ analysis, review, sources }: { analysis: Analysis; review: Review | null; sources: SourcesPayload["items"] }) {
  const units = new Map<string, number>();
  analysis.market_metrics.forEach((m) => m.numeric_value != null && m.unit && units.set(m.unit, (units.get(m.unit) ?? 0) + 1));
  const topUnit = [...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const metrics = analysis.market_metrics.filter((m) => m.numeric_value != null && m.unit === topUnit).map((m) => ({ name: m.year ? `${m.label} (${m.year})` : m.label, value: m.numeric_value }));
  const domains = Object.entries(sources.reduce<Record<string, number>>((a, s) => ((a[s.domain] = (a[s.domain] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  const claims = review ? (["supported", "partial", "unsupported"] as const).map((k) => ({ name: k, value: review.claims.filter((c) => c.status === k).length })).filter((x) => x.value) : [];
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-1">
        <p className="eyebrow">Market figures {topUnit ? `(${topUnit})` : ""}</p>
        {metrics.length ? (
          <ResponsiveContainer width="100%" height={220}><BarChart data={metrics}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} hide /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        ) : <p className="mt-6 text-sm text-muted-foreground">No comparable numeric figures in the sources.</p>}
      </Card>
      <Card><p className="eyebrow">Source domains</p><ResponsiveContainer width="100%" height={220}><BarChart data={domains} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="var(--chart-2)" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></Card>
      <Card><p className="eyebrow">Claim verification</p>{claims.length ? (<ResponsiveContainer width="100%" height={220}><PieChart><Pie data={claims} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label={(e) => e.name}>{claims.map((c, i) => <Cell key={c.name} fill={[CHART[2], CHART[3], "var(--destructive)"][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>) : <p className="mt-6 text-sm text-muted-foreground">Pending verification.</p>}</Card>
    </section>
  );
}

function Cites({ ids, sources }: { ids: number[]; sources: SourcesPayload["items"] }) {
  const valid = ids.map((i) => sources.find((s) => s.id === i)).filter(Boolean);
  if (!valid.length) return <p className="mt-2 text-xs text-destructive">No source cited</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {valid.map((s) => <a key={s!.id} href={s!.url} target="_blank" rel="noreferrer" title={s!.title} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-accent hover:text-accent-foreground">[{s!.id}] {s!.domain}</a>)}
    </div>
  );
}

function ListCard({ title, items, sources }: { title: string; items: { text: string; source_ids: number[] }[]; sources: SourcesPayload["items"] }) {
  return <Card><h3 className="text-lg font-semibold">{title}</h3><ul className="mt-2 space-y-3 text-sm">{items.map((o) => <li key={o.text}>{o.text}<Cites ids={o.source_ids} sources={sources} /></li>)}</ul></Card>;
}

function ClaimIcon({ s }: { s: string }) {
  if (s === "supported") return <Check className="h-5 w-5 shrink-0 text-success" />;
  if (s === "partial") return <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />;
  return <X className="h-5 w-5 shrink-0 text-destructive" />;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border bg-card p-4 ${className}`}>{children}</div>;
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border bg-card p-4"><p className="eyebrow">{label}</p><p className="mt-1 font-display text-3xl capitalize">{value}</p></div>;
}
function Notice({ tone, title, children }: { tone: "error" | "warn"; title: string; children: React.ReactNode }) {
  return <div className={`mt-6 rounded-lg border p-4 text-sm ${tone === "error" ? "border-destructive/40 bg-destructive/10" : "border-warning/50 bg-warning/10"}`}><p className="font-semibold">{title}</p><p className="mt-1">{children}</p></div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">{children}</div>;
}

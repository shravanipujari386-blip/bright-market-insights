import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch, useRouter } from "@tanstack/react-router";
import { Download, ExternalLink, FileSearch, ArrowRight, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { workspaceQueryOptions, reportData, metricGroups, type SavedReport } from "@/lib/workspace-data";
import { exportCsv, exportPdf } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { StatusBadge } from "@/components/StatusBadge";

export type WorkspaceView = "overview" | "history" | "market" | "competitors" | "product" | "customers" | "visualizations" | "sources" | "reports";
const titles: Record<WorkspaceView, string> = { overview: "Overview", history: "Research History", market: "Market Analysis", competitors: "Competitor Analysis", product: "Product Analysis", customers: "Customer Insights", visualizations: "Visualizations", sources: "Sources & References", reports: "Reports" };

export function WorkspaceError() {
  const router = useRouter();
  return <main className="p-8"><h1 className="text-2xl">Research could not be loaded</h1><Button className="mt-4" onClick={() => router.invalidate()}>Try again</Button></main>;
}
export function WorkspaceNotFound() { return <main className="p-8">Research not found.</main>; }

function Empty({ children = "No research data available yet." }: { children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-4 border-y py-16 text-center"><FileSearch className="h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">{children}</p><Button asChild><Link to="/new-research">New Research<ArrowRight className="h-4 w-4" /></Link></Button></div>;
}

function Citations({ ids, report }: { ids: number[]; report: SavedReport }) {
  const { sources } = reportData(report);
  return <span className="mt-3 flex flex-wrap gap-2">{ids.map((id) => {
    const source = sources.find((s) => s.id === id);
    return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title} className="text-xs font-mono text-accent underline">[{id}]</a> : <span key={id} className="text-xs text-muted-foreground">[{id}] unavailable</span>;
  })}</span>;
}

function ReportList({ reports, downloads = false }: { reports: SavedReport[]; downloads?: boolean }) {
  const qc = useQueryClient();
  const router = useRouter();
  async function remove(report: SavedReport) {
    if (!window.confirm(`Delete this report? This cannot be undone.\n\n${report.query}`)) return;
    const { error } = await supabase.from("research_reports").delete().eq("id", report.id);
    if (error) return toast.error("Could not delete report.");
    await qc.invalidateQueries({ queryKey: ["reports"] });
    await router.invalidate();
    toast.success("Report deleted");
  }
  async function pdf(report: SavedReport) {
    const { analysis, review, sources } = reportData(report);
    try { await exportPdf(report.query, analysis, review, sources); } catch { toast.error("Could not download PDF."); }
  }
  return reports.length ? <ul className="divide-y border-y">{reports.map((report) => {
    const { analysis, review, sources } = reportData(report);
    return <li key={report.id} className="flex flex-wrap items-center gap-3 py-5">
      <Link to="/reports/$id" params={{ id: report.id }} className="min-w-0 flex-1 basis-60"><p className="font-medium hover:text-accent">{report.query}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()} · {sources.length} sources</p></Link>
      <StatusBadge status={report.status} />
      {downloads ? <><Button size="sm" variant="outline" onClick={() => exportCsv(report.query, analysis, review, sources)}><Download className="h-4 w-4" />CSV</Button><Button size="sm" variant="outline" onClick={() => pdf(report)}><Download className="h-4 w-4" />PDF</Button></> : <Button aria-label="Delete report" title="Delete report" size="icon" variant="ghost" onClick={() => remove(report)}><Trash2 className="h-4 w-4" /></Button>}
    </li>;
  })}</ul> : <Empty>No reports match your selection.</Empty>;
}

export function ResearchWorkspace({ view }: { view: WorkspaceView }) {
  const { data: reports } = useSuspenseQuery(workspaceQueryOptions);
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const reportId = "report" in search ? search.report : "";
  const query = "q" in search ? search.q : "";
  const status = "status" in search ? search.status : "all";
  const selected = reports.find((r) => r.id === reportId) ?? reports.find((r) => r.analysis || r.sources) ?? reports[0];
  const { plan, analysis, review, sources } = reportData(selected);
  const completed = reports.filter((r) => r.status === "complete");
  const filtered = (view === "reports" ? completed : reports).filter((r) => r.query.toLowerCase().includes((query ?? "").toLowerCase()) && (status === "all" || !status || r.status === status));
  const listView = view === "history" || view === "reports";
  const groups = metricGroups(analysis);
  const changeSearch = (key: "report" | "q" | "status", value: string) => navigate({ to: ".", search: (previous) => ({ ...previous, [key]: value }), replace: key === "q" });

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Meridian / Research workspace</p><h1 className="mt-2 text-3xl font-semibold md:text-4xl">{titles[view]}</h1></div><Button asChild><Link to="/new-research">New Research<ArrowRight className="h-4 w-4" /></Link></Button></div>
    {view === "overview" ? <>
      <div className="my-8 grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ["Total research", reports.length], ["Completed reports", completed.length], ["Sources collected", reports.reduce((sum, r) => sum + reportData(r).sources.length, 0)], ["Competitors identified", new Set(reports.flatMap((r) => reportData(r).analysis?.competitors.map((c) => c.name.toLowerCase()) ?? [])).size],
      ].map(([label, value]) => <div key={label} className="border-l-2 border-accent py-2 pl-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-mono text-3xl">{value}</p></div>)}</div>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-semibold">Latest research</h2><Button asChild variant="ghost"><Link to="/research-history">View history<ArrowRight className="h-4 w-4" /></Link></Button></div><ReportList reports={reports.slice(0, 6)} />
    </> : listView ? <>
      <div className="my-6 flex flex-wrap gap-3"><Input aria-label="Search research" placeholder="Search research…" value={query ?? ""} onChange={(e) => changeSearch("q", e.target.value)} className="max-w-md" />
      {view === "history" && <Select value={status ?? "all"} onValueChange={(v) => changeSearch("status", v)}><SelectTrigger aria-label="Filter status" className="w-44"><SelectValue /></SelectTrigger><SelectContent>{["all", "complete", "failed", "clarify", "planning", "searching", "analyzing", "reviewing"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>}</div>
      <ReportList reports={filtered} downloads={view === "reports"} />
    </> : <>
      {reports.length > 0 && <div className="my-6"><Select value={selected?.id} onValueChange={(v) => changeSearch("report", v)}><SelectTrigger aria-label="Select research report" className="h-auto min-h-11 w-full max-w-3xl text-left [&>span]:truncate"><SelectValue placeholder="Select research report" /></SelectTrigger><SelectContent>{reports.map((r) => <SelectItem key={r.id} value={r.id}>{r.query}</SelectItem>)}</SelectContent></Select>
      {selected && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><StatusBadge status={selected.status} /><span>{new Date(selected.created_at).toLocaleDateString()}</span><Link to="/reports/$id" params={{ id: selected.id }} className="underline">Open full report</Link>{review && <span>Confidence: {review.overall_confidence}</span>}</div>}</div>}
      {!selected ? <Empty /> : <>
        {view === "market" && (analysis ? <><h2 className="mb-4 text-2xl">Market metrics</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{analysis.market_metrics.map((m, i) => <article key={i} className="rounded-md border bg-card p-5"><p className="text-sm text-muted-foreground">{m.label}</p><p className="mt-2 text-2xl font-semibold">{m.value_text}</p><p className="mt-1 text-xs text-muted-foreground">{m.year ?? "Year not stated"}</p><Citations ids={m.source_ids} report={selected} /></article>)}</div><h2 className="mb-4 mt-8 text-2xl">Market trends</h2><div className="divide-y border-y">{analysis.trends.map((t, i) => <article key={i} className="py-5"><h3 className="text-xl">{t.title}</h3><p className="mt-2">{t.description}</p><p className="mt-2 text-sm text-muted-foreground">Impact: {t.impact}</p><Citations ids={t.source_ids} report={selected} /></article>)}</div>{!analysis.market_metrics.length && !analysis.trends.length && <Empty>No market metrics or trends found in this report.</Empty>}</> : <Empty>No market analysis available for this report.</Empty>)}
        {view === "competitors" && (analysis?.competitors.length ? <div className="grid gap-4 lg:grid-cols-2">{analysis.competitors.map((c, i) => <article key={i} className="rounded-md border bg-card p-5"><h2 className="text-2xl">{c.name}</h2><p className="mt-3">{c.description}</p><dl className="mt-5 space-y-4 text-sm"><div><dt className="font-semibold text-success">Strengths</dt><dd className="mt-1">{c.strengths}</dd></div><div><dt className="font-semibold text-destructive">Weaknesses</dt><dd className="mt-1">{c.weaknesses}</dd></div></dl><Citations ids={c.source_ids} report={selected} /></article>)}</div> : <Empty>No competitors identified in this report.</Empty>)}
        {view === "product" && <><div className="border-y py-5"><p className="eyebrow">Product focus</p><h2 className="mt-2 text-2xl">{plan?.product ?? "No specific product identified"}</h2>{plan?.industry && <p className="mt-2 text-muted-foreground">{plan.industry}{plan.geography ? ` · ${plan.geography}` : ""}</p>}</div><div className="mt-8 grid gap-8 lg:grid-cols-2">{(["opportunities", "risks"] as const).map((key) => <section key={key}><h2 className="mb-4 text-2xl capitalize">{key}</h2>{analysis?.[key].length ? <ul className="divide-y border-y">{analysis[key].map((item, i) => <li key={i} className="py-4">{item.text}<Citations ids={item.source_ids} report={selected} /></li>)}</ul> : <p className="text-muted-foreground">No {key} identified in this report.</p>}</section>)}</div></>}
        {view === "customers" && <><div className="mb-6 border-y py-5"><p className="eyebrow">Target audience</p><h2 className="mt-2 text-2xl">{plan?.audience ?? "Audience not specified"}</h2></div>{analysis?.segments.length ? <div className="grid gap-4 lg:grid-cols-2">{analysis.segments.map((s, i) => <article key={i} className="rounded-md border bg-card p-5"><h2 className="text-xl">{s.name}</h2><p className="mt-3">{s.description}</p><Citations ids={s.source_ids} report={selected} /></article>)}</div> : <Empty>No customer segments identified in this report.</Empty>}</>}
        {view === "visualizations" && (groups.length ? <div className="grid gap-8 lg:grid-cols-2">{groups.map((group) => <section key={group.label} className="min-w-0 border-t pt-5"><h2 className="mb-4 text-xl">{group.label}</h2><ChartContainer className="h-64 w-full" config={{ numeric_value: { label: group.label, color: "var(--chart-1)" } }}><BarChart data={group.metrics.map((m) => ({ ...m, period: m.year ? String(m.year) : "Unspecified year" }))}><CartesianGrid vertical={false} /><XAxis dataKey="period" /><YAxis width={65} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="numeric_value" fill="var(--color-numeric_value)" radius={4} /></BarChart></ChartContainer><ul className="mt-4 space-y-2 text-sm">{group.metrics.map((m, i) => <li key={i}>{m.year ?? "Year not stated"}: {m.value_text}<Citations ids={m.source_ids} report={selected} /></li>)}</ul></section>)}</div> : <Empty>No sourced numeric metrics with stated units available to chart.</Empty>)}
        {view === "sources" && (sources.length ? <div className="divide-y border-y">{sources.filter((s) => `${s.title} ${s.domain}`.toLowerCase().includes((query ?? "").toLowerCase())).map((source) => <article key={source.id} className="py-5"><div className="flex items-start gap-3"><span className="font-mono text-sm text-accent">[{source.id}]</span><div className="min-w-0"><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium hover:text-accent">{source.title}<ExternalLink className="h-4 w-4 shrink-0" /></a><p className="mt-1 text-xs text-muted-foreground">{source.domain} · {source.published ?? "Publication date not stated"}</p><p className="mt-3 text-sm">{source.snippet}</p></div></div></article>)}</div> : <Empty>No sources collected for this report.</Empty>)}
        {analysis?.limitations.length && view !== "sources" && <section className="mt-10 border-t pt-5"><h2 className="text-xl">Research limitations</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{analysis.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul></section>}
      </>}
    </>}
  </main>;
}
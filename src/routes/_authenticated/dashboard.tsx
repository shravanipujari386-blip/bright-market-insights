import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startResearch } from "@/lib/research.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Research dashboard — Meridian" },
      { name: "description", content: "Ask a market research question and review your report history." },
      { property: "og:title", content: "Research dashboard — Meridian" },
      { property: "og:description", content: "Ask a market research question and review your report history." },
    ],
  }),
  component: Dashboard,
});

const examples = [
  "What is the market size and growth outlook for plant-based protein in India through 2030?",
  "Who are the leading competitors in AI-powered note-taking apps for students, and how do they differ?",
  "What trends are shaping the European e-bike market in 2026?",
];

function Dashboard() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const start = useServerFn(startResearch);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const history = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_reports")
        .select("id, query, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function submit() {
    if (q.trim().length < 10) {
      toast.error("Please describe your research question in a bit more detail.");
      return;
    }
    setBusy(true);
    try {
      const r = await start({ data: { query: q.trim() } });
      navigate({ to: "/reports/$id", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start research");
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await supabase.from("research_reports").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["reports"] });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">New research</p>
      <h1 className="mt-2 text-4xl font-semibold">What do you want to know about a market?</h1>
      <div className="mt-6 rounded-lg border bg-card p-4 shadow-sm">
        <Textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={4}
          maxLength={600}
          placeholder="e.g. What is the competitive landscape for electric two-wheelers in Southeast Asia?"
          className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs text-muted-foreground">Uses live web search · takes about 1–3 minutes</span>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Planning research…" : "Run research"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((e) => (
          <button key={e} onClick={() => setQ(e)} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
            {e}
          </button>
        ))}
      </div>

      <section className="rule-top mt-14 pt-6">
        <h2 className="text-2xl font-semibold">Research history</h2>
        {history.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        {history.data?.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No reports yet. Your completed research will appear here.</p>}
        <ul className="mt-4 divide-y rounded-lg border bg-card">
          {history.data?.map((r) => (
            <li key={r.id} className="flex items-center gap-4 p-4">
              <Link to="/reports/$id" params={{ id: r.id }} className="min-w-0 flex-1">
                <p className="truncate font-medium hover:text-accent">{r.query}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </Link>
              <StatusBadge status={r.status} />
              <Button variant="ghost" size="icon" aria-label="Delete report" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { startResearch } from "@/lib/research.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const examples = [
  "What is the market size and growth outlook for plant-based protein in India through 2030?",
  "Who are the leading competitors in AI-powered note-taking apps for students, and how do they differ?",
  "What trends are shaping the European e-bike market in 2026?",
];

export function NewResearch() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const start = useServerFn(startResearch);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 10) return toast.error("Please describe your research question in a bit more detail.");
    setBusy(true);
    try {
      const report = await start({ data: { query: question.trim() } });
      await navigate({ to: "/reports/$id", params: { id: report.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start research");
    } finally { setBusy(false); }
  }
  return <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
    <p className="eyebrow">New research</p>
    <h1 className="mt-2 text-3xl font-semibold md:text-4xl">What do you want to know about a market?</h1>
    <form onSubmit={submit} className="mt-8 rounded-md border bg-card p-4">
      <Textarea aria-label="Research question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={5} maxLength={600} placeholder="What is the competitive landscape for electric two-wheelers in Southeast Asia?" className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="font-mono text-xs text-muted-foreground">{question.length}/600</span>
        <Button type="submit" disabled={busy}>{busy ? "Starting research…" : "Run research"}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
    <h2 className="mt-8 text-xl font-semibold">Suggested questions</h2>
    <div className="mt-4 grid gap-3">{examples.map((example) => <Button key={example} variant="outline" onClick={() => setQuestion(example)} className="h-auto justify-start whitespace-normal py-4 text-left font-normal">{example}<ArrowRight className="ml-auto h-4 w-4 shrink-0" /></Button>)}</div>
  </main>;
}
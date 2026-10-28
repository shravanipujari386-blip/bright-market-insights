import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Brain, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian — Intelligent Market Research Agent" },
      { name: "description", content: "Smarter Research. Better Insights. Faster Decisions. AI agents research live web sources and deliver cited market reports." },
      { property: "og:title", content: "Meridian — Intelligent Market Research Agent" },
      { property: "og:description", content: "AI agents research live web sources and deliver cited market reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: Brain, t: "Plan", d: "Interprets your question and drafts focused search queries." },
  { icon: Search, t: "Search", d: "Retrieves and deduplicates live web sources." },
  { icon: FileText, t: "Analyze", d: "Specialist agents cover trends, competitors, customers and market size." },
  { icon: ShieldCheck, t: "Verify", d: "A reviewer checks every key claim against the evidence." },
];

function Index() {
  return (
    <div className="min-h-screen paper-grid">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16">
        <p className="eyebrow">Smarter Research · Better Insights · Faster Decisions</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] md:text-7xl">
          Market research, <em className="text-accent">sourced</em> and verified in minutes.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Ask a question in plain language. A team of AI agents searches the live web, analyses the evidence,
          fact-checks the claims, and hands you a cited report with charts and downloads.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard">
              Start researching <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <section className="rule-top mt-20 grid gap-8 pt-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.t}>
              <div className="eyebrow">0{i + 1}</div>
              <s.icon className="mt-3 h-6 w-6 text-accent" />
              <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

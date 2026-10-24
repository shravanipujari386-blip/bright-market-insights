import { z } from "zod";
import { runStructured } from "./ai.server";
import type { Plan, Source, Analysis, Review } from "./research-types";

/* ---------- 1. Query Planning Agent ---------- */
const planSchema = z.object({
  industry: z.string().nullable(),
  product: z.string().nullable(),
  geography: z.string().nullable(),
  time_period: z.string().nullable(),
  audience: z.string().nullable(),
  categories: z.array(z.string()),
  search_queries: z.array(z.string()),
  assumptions: z.array(z.string()),
  needs_clarification: z.boolean(),
  clarification_question: z.string().nullable(),
});

export async function planQuery(query: string): Promise<Plan> {
  const p = await runStructured({
    name: "research_plan",
    schema: planSchema,
    instructions:
      "You are a market research query planner. Extract only details actually stated or clearly implied. Never invent specifics. " +
      "Categories come from: market_size, trends, competitors, products, customer_segments, pricing, regulation. " +
      "Write 3-5 focused web search queries. Set needs_clarification=true only if the question is too vague to research at all (e.g. no identifiable market).",
    prompt: `Research question: ${query}`,
  });
  return { ...p, search_queries: p.search_queries.slice(0, 5) };
}

/* ---------- 2. Live Search & Retrieval Agent ---------- */
export async function searchSources(queries: string[]) {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) throw new Error("Live search is not configured (missing Tavily key).");
  const failures: string[] = [];
  const seen = new Map<string, Source>();
  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query: q, max_results: 6, search_depth: "advanced", topic: "general" }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) {
          failures.push(`"${q}": search returned ${res.status}`);
          return;
        }
        const j = (await res.json()) as {
          results?: { title: string; url: string; content: string; score?: number; published_date?: string }[];
        };
        for (const r of j.results ?? []) {
          const url = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
          if ((r.score ?? 1) < 0.3) continue;
          const prev = seen.get(url);
          if (prev && (prev.score ?? 0) >= (r.score ?? 0)) continue;
          seen.set(url, {
            id: 0,
            title: r.title,
            url: r.url,
            snippet: (r.content ?? "").slice(0, 1200),
            domain: safeDomain(r.url),
            published: r.published_date ?? null,
            score: r.score ?? null,
            query: q,
          });
        }
      } catch (e) {
        failures.push(`"${q}": ${e instanceof Error ? e.message : "request failed"}`);
      }
    }),
  );
  const sources = [...seen.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 24)
    .map((s, i) => ({ ...s, id: i + 1 }));
  return { sources, failures };
}

function safeDomain(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

function evidence(sources: Source[]) {
  return sources
    .map((s) => `[${s.id}] ${s.title} (${s.domain}${s.published ? ", " + s.published : ""})\n${s.snippet}`)
    .join("\n\n");
}

/* ---------- 3-6. Specialist analysis agents (trends, competitors, customers, market size) ---------- */
const ids = z.array(z.number());
const analysisSchema = z.object({
  executive_summary: z.string(),
  market_metrics: z.array(
    z.object({
      label: z.string(),
      value_text: z.string(),
      numeric_value: z.number().nullable(),
      unit: z.string().nullable(),
      year: z.number().nullable(),
      source_ids: ids,
    }),
  ),
  trends: z.array(z.object({ title: z.string(), description: z.string(), impact: z.string(), source_ids: ids })),
  competitors: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      strengths: z.string(),
      weaknesses: z.string(),
      source_ids: ids,
    }),
  ),
  segments: z.array(z.object({ name: z.string(), description: z.string(), source_ids: ids })),
  opportunities: z.array(z.object({ text: z.string(), source_ids: ids })),
  risks: z.array(z.object({ text: z.string(), source_ids: ids })),
  limitations: z.array(z.string()),
});

export async function analyze(query: string, plan: Plan, sources: Source[]): Promise<Analysis> {
  return runStructured({
    name: "market_analysis",
    schema: analysisSchema,
    instructions:
      "You are a team of market research analysts (market trends, competitor intelligence, customer insights, market sizing). " +
      "Use ONLY the numbered evidence provided. Every item must cite source ids from the evidence. " +
      "Never fabricate numbers: market_metrics must be figures explicitly stated in sources (numeric_value in the stated unit, e.g. billions USD as unit 'USD billion'). " +
      "If evidence is thin for a section, return fewer items and explain in limitations. Aim for up to 6 trends, 8 competitors, 5 segments. Write concisely.",
    prompt: `Research question: ${query}\nPlan: ${JSON.stringify(plan)}\n\nEVIDENCE:\n${evidence(sources)}`,
  });
}

/* ---------- 7. Review / verification agent + synthesis ---------- */
const reviewSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string(),
      status: z.enum(["supported", "partial", "unsupported"]),
      note: z.string(),
      source_ids: ids,
    }),
  ),
  overall_confidence: z.enum(["high", "medium", "low"]),
  confidence_reason: z.string(),
  recommendations: z.array(z.string()),
  conclusion: z.string(),
});

export async function review(query: string, analysis: Analysis, sources: Source[]): Promise<Review> {
  return runStructured({
    name: "verification_review",
    schema: reviewSchema,
    instructions:
      "You are a strict fact-checking reviewer and synthesis lead. Check the most important claims in the draft analysis (all market metrics plus key trend/competitor claims, up to 12) against the evidence text. " +
      "'supported' only if the cited snippet states it; 'partial' if loosely implied; 'unsupported' otherwise. Then give 3-5 actionable recommendations and a short conclusion based only on supported findings.",
    prompt: `Question: ${query}\n\nDRAFT ANALYSIS:\n${JSON.stringify(analysis)}\n\nEVIDENCE:\n${evidence(sources)}`,
  });
}

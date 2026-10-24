export type Plan = {
  industry: string | null;
  product: string | null;
  geography: string | null;
  time_period: string | null;
  audience: string | null;
  categories: string[];
  search_queries: string[];
  assumptions: string[];
  needs_clarification: boolean;
  clarification_question: string | null;
};

export type Source = {
  id: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  published: string | null;
  score: number | null;
  query: string;
};

export type Cited = { source_ids: number[] };

export type Analysis = {
  executive_summary: string;
  market_metrics: ({
    label: string;
    value_text: string;
    numeric_value: number | null;
    unit: string | null;
    year: number | null;
  } & Cited)[];
  trends: ({ title: string; description: string; impact: string } & Cited)[];
  competitors: ({ name: string; description: string; strengths: string; weaknesses: string } & Cited)[];
  segments: ({ name: string; description: string } & Cited)[];
  opportunities: ({ text: string } & Cited)[];
  risks: ({ text: string } & Cited)[];
  limitations: string[];
};

export type Review = {
  claims: ({ claim: string; status: "supported" | "partial" | "unsupported"; note: string } & Cited)[];
  overall_confidence: "high" | "medium" | "low";
  confidence_reason: string;
  recommendations: string[];
  conclusion: string;
};

export type SourcesPayload = { items: Source[]; failures: string[] };

export type StageEntry = { stage: string; status: "done" | "failed"; at: string; detail?: string };

export type ReportStatus = "planning" | "clarify" | "searching" | "analyzing" | "reviewing" | "complete" | "failed";

export const STAGES: { key: string; label: string }[] = [
  { key: "planning", label: "Query planning" },
  { key: "searching", label: "Live web search" },
  { key: "analyzing", label: "Specialist analysis" },
  { key: "reviewing", label: "Verification & synthesis" },
];

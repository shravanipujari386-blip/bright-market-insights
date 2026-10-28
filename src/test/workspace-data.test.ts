import { describe, expect, it } from "vitest";
import { metricGroups } from "@/lib/workspace-data";
import type { Analysis } from "@/lib/research-types";

describe("Sourced metric charts", () => {
  it("excludes missing numbers and citations, and separates units", () => {
    const analysis: Analysis = {
      executive_summary: "", trends: [], competitors: [], segments: [], opportunities: [], risks: [], limitations: [],
      market_metrics: [
        { label: "Revenue", value_text: "$2bn", numeric_value: 2, unit: "USD billion", year: 2026, source_ids: [1] },
        { label: "Revenue", value_text: "3%", numeric_value: 3, unit: "%", year: 2026, source_ids: [2] },
        { label: "Revenue", value_text: "Unknown", numeric_value: null, unit: "USD billion", year: null, source_ids: [1] },
        { label: "Revenue", value_text: "$9bn", numeric_value: 9, unit: "USD billion", year: 2026, source_ids: [] },
      ],
    };
    const groups = metricGroups(analysis);
    expect(groups).toHaveLength(2);
    expect(groups[0].metrics.map((m) => m.numeric_value)).toEqual([2]);
    expect(groups[1].metrics.map((m) => m.numeric_value)).toEqual([3]);
  });
});
import type { Analysis, Review, Source } from "./research-types";

function esc(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const slug = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

export function exportCsv(query: string, a: Analysis | null, r: Review | null, sources: Source[]) {
  const rows: unknown[][] = [["section", "item", "detail", "extra", "source_ids"]];
  a?.market_metrics.forEach((m) => rows.push(["market_metric", m.label, m.value_text, m.year ?? "", m.source_ids.join(" ")]));
  a?.trends.forEach((t) => rows.push(["trend", t.title, t.description, t.impact, t.source_ids.join(" ")]));
  a?.competitors.forEach((c) => rows.push(["competitor", c.name, c.description, `Strengths: ${c.strengths} | Weaknesses: ${c.weaknesses}`, c.source_ids.join(" ")]));
  a?.segments.forEach((s) => rows.push(["segment", s.name, s.description, "", s.source_ids.join(" ")]));
  a?.opportunities.forEach((o) => rows.push(["opportunity", o.text, "", "", o.source_ids.join(" ")]));
  a?.risks.forEach((o) => rows.push(["risk", o.text, "", "", o.source_ids.join(" ")]));
  r?.claims.forEach((c) => rows.push(["verification", c.claim, c.status, c.note, c.source_ids.join(" ")]));
  sources.forEach((s) => rows.push(["source", `[${s.id}] ${s.title}`, s.url, s.published ?? "", s.id]));
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  download(`${slug(query)}.csv`, new Blob([csv], { type: "text/csv" }));
}

export async function exportPdf(query: string, a: Analysis | null, r: Review | null, sources: Source[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const text = (s: string, size = 10, style: "normal" | "bold" = "normal", gap = 4) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(s, W - M * 2);
    for (const l of lines) {
      ensure(size + 2);
      doc.text(l, M, y);
      y += size + 3;
    }
    y += gap;
  };
  const cite = (ids: number[]) => (ids.length ? ` [${ids.join(", ")}]` : "");
  text("Market Research Report", 20, "bold", 6);
  text(query, 12, "normal", 4);
  text(`Generated ${new Date().toLocaleString()}`, 8, "normal", 12);
  if (a) {
    text("Executive summary", 14, "bold");
    text(a.executive_summary);
    if (a.market_metrics.length) {
      text("Market metrics", 14, "bold");
      a.market_metrics.forEach((m) => text(`• ${m.label}: ${m.value_text}${cite(m.source_ids)}`));
    }
    text("Trends", 14, "bold");
    a.trends.forEach((t) => text(`• ${t.title} — ${t.description} (Impact: ${t.impact})${cite(t.source_ids)}`));
    text("Competitors", 14, "bold");
    a.competitors.forEach((c) => text(`• ${c.name}: ${c.description} Strengths: ${c.strengths}. Weaknesses: ${c.weaknesses}.${cite(c.source_ids)}`));
    text("Customer segments", 14, "bold");
    a.segments.forEach((s) => text(`• ${s.name}: ${s.description}${cite(s.source_ids)}`));
    text("Opportunities", 14, "bold");
    a.opportunities.forEach((o) => text(`• ${o.text}${cite(o.source_ids)}`));
    text("Risks", 14, "bold");
    a.risks.forEach((o) => text(`• ${o.text}${cite(o.source_ids)}`));
  }
  if (r) {
    text("Verification", 14, "bold");
    text(`Overall confidence: ${r.overall_confidence}. ${r.confidence_reason}`);
    r.claims.forEach((c) => text(`• [${c.status}] ${c.claim} — ${c.note}${cite(c.source_ids)}`));
    text("Recommendations", 14, "bold");
    r.recommendations.forEach((x) => text(`• ${x}`));
    text("Conclusion", 14, "bold");
    text(r.conclusion);
  }
  if (a?.limitations.length) {
    text("Limitations", 14, "bold");
    a.limitations.forEach((l) => text(`• ${l}`));
  }
  text("Sources", 14, "bold");
  sources.forEach((s) => text(`[${s.id}] ${s.title} — ${s.url}`, 8, "normal", 2));
  doc.save(`${slug(query)}.pdf`);
}

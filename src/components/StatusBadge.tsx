import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "bg-success/15 text-success" },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  clarify: { label: "Needs detail", cls: "bg-warning/20 text-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = map[status] ?? { label: "In progress", cls: "bg-accent/15 text-accent" };
  return <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide", s.cls)}>{s.label}</span>;
}

import { Link } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-2">
      <span className="font-display text-xl font-semibold">Meridian</span>
      <span className="eyebrow hidden sm:inline">Market Research Agent</span>
    </Link>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/60 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="eyebrow hidden sm:inline">Smarter Research. Better Insights. Faster Decisions.</span>
      </div>
    </header>
  );
}

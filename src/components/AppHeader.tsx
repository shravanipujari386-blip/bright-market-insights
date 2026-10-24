import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Logo() {
  return (
    <Link to="/" className="flex items-baseline gap-2">
      <span className="font-display text-xl font-semibold">Meridian</span>
      <span className="eyebrow hidden sm:inline">Market Research Agent</span>
    </Link>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  return (
    <header className="border-b bg-card/60 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Research</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </nav>
      </div>
    </header>
  );
}

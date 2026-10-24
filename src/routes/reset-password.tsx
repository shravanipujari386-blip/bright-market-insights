import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Meridian" },
      { name: "description", content: "Choose a new password for your Meridian account." },
      { property: "og:title", content: "Reset password — Meridian" },
      { property: "og:description", content: "Choose a new password for your Meridian account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (p.length < 8) return setErr("Password must be at least 8 characters");
    if (p !== c) return setErr("Passwords do not match");
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) return setErr(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold">Set a new password</h1>
        <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={p} onChange={(e) => setP(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" value={c} onChange={(e) => setC(e.target.value)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" type="submit">Update password</Button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Mail, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRouteApi } from "@tanstack/react-router";

export function AccountSettings() {
  const { user } = getRouteApi("/_authenticated").useRouteContext();
  const [name, setName] = useState<string>(user.user_metadata.full_name ?? "");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function action(task: () => Promise<void>) {
    setBusy(true);
    try { await task(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update settings"); } finally { setBusy(false); }
  }
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8"><p className="eyebrow">Meridian / Account</p><h1 className="mt-2 text-4xl font-semibold">Settings</h1>
    <section className="mt-8 max-w-2xl border-t py-6"><h2 className="text-2xl">Profile</h2><form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); action(async () => { const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } }); if (error) throw error; toast.success("Profile saved"); }); }}><div><Label htmlFor="account-name">Full name</Label><Input id="account-name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div><div><Label htmlFor="account-email">Email</Label><Input id="account-email" className="mt-2" value={user.email ?? ""} readOnly /></div><Button type="submit" disabled={busy}><Save className="h-4 w-4" />Save profile</Button></form></section>
    <section className="max-w-2xl border-t py-6"><h2 className="text-2xl">Security</h2><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" disabled={busy || !user.email} onClick={() => action(async () => { if (!user.email) return; const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; toast.success("Password reset email sent"); })}><Mail className="h-4 w-4" />Send password reset email</Button><Button variant="outline" disabled={busy} onClick={() => action(async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; qc.clear(); await navigate({ to: "/auth" }); })}><LogOut className="h-4 w-4" />Log out</Button></div></section>
    <section className="max-w-2xl border-t py-6"><h2 className="text-2xl text-destructive">Research data</h2><Button className="mt-5" variant="destructive" disabled={busy} onClick={() => { if (!window.confirm("Permanently delete all of your research reports? This cannot be undone.")) return; action(async () => { const { error } = await supabase.from("research_reports").delete().eq("user_id", user.id); if (error) throw error; await qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Research history cleared"); }); }}><Trash2 className="h-4 w-4" />Clear research history</Button></section>
  </main>;
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AppHeader";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Meridian Market Research" },
      { name: "description", content: "Sign in or create an account to run AI market research." },
      { property: "og:title", content: "Sign in — Meridian Market Research" },
      { property: "og:description", content: "Sign in or create an account to run AI market research." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function safePath(p?: string) {
  if (!p) return "/dashboard";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safePath(redirect) });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: safePath(redirect) });
    });
    return () => data.subscription.unsubscribe();
  }, [redirect, navigate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const p = signupSchema.safeParse(f);
        if (!p.success) return setErr(p.error.issues[0].message);
        const { error } = await supabase.auth.signUp({
          email: p.data.email,
          password: p.data.password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: p.data.name } },
        });
        if (error) return setErr(error.message);
        toast.success("Check your email to confirm your account.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) return setErr(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return setErr(error.message);
        toast.success("Password reset link sent.");
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  }

  async function oauth(p: "google" | "lovable") {
    sessionStorage.setItem("post_auth", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setErr(r.error.message ?? "Sign-in failed");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <span className="font-display text-2xl">Meridian</span>
        <div>
          <p className="font-display text-4xl leading-tight">"Every claim, traced back to its source."</p>
          <p className="mt-4 text-sm opacity-70">Smarter Research. Better Insights. Faster Decisions.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8"><Logo /></div>
          <h1 className="text-3xl font-semibold">
            {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5"><Label>Full name</Label><Input value={f.name} onChange={set("name")} required /></div>
            )}
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} required /></div>
            {mode !== "forgot" && (
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={f.password} onChange={set("password")} required /></div>
            )}
            {mode === "signup" && (
              <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" value={f.confirm} onChange={set("confirm")} required /></div>
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continue with Google</Button>
                <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
              </div>
            </>
          )}
          <div className="mt-6 flex justify-between text-sm">
            <button className="text-accent hover:underline" onClick={() => { setErr(null); setMode(mode === "signup" ? "signin" : "signup"); }}>
              {mode === "signup" ? "Have an account? Sign in" : "Create an account"}
            </button>
            {mode === "signin" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
            {mode === "forgot" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("signin")}>Back</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

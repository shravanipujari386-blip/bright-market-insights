import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, FileSearch, ShieldCheck, TrendingUp, Download } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AppHeader";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
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

const highlights = [
  { icon: FileSearch, t: "Live web sources", d: "Every report is built from real, current pages — nothing invented." },
  { icon: ShieldCheck, t: "Fact-checked claims", d: "A reviewer agent traces each key claim back to its source." },
  { icon: TrendingUp, t: "Trends & competitors", d: "Structured analysis across trends, competitors, customers and market size." },
  { icon: Download, t: "Shareable reports", d: "Download your findings as PDF or CSV with citations included." },
];

function safePath(p?: string) {
  p = p ?? sessionStorage.getItem("post_auth") ?? undefined;
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
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        if (!p.success) return setErr(p.error.issues[0]?.message ?? "Invalid input");
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

  const heading = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const subcopy =
    mode === "signup"
      ? "Start researching in minutes — free to try."
      : mode === "forgot"
        ? "We'll email you a link to set a new password."
        : "Sign in to run research and see your reports.";

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="paper-grid absolute inset-0 opacity-[0.08]" />
        <div className="relative">
          <span className="font-display text-2xl">Meridian</span>
          <p className="eyebrow mt-1 !text-primary-foreground/60">Market Research Agent</p>
        </div>
        <div className="relative">
          <p className="font-display text-4xl leading-tight">"Every claim, traced back to its source."</p>
          <p className="mt-3 text-sm opacity-70">Smarter Research. Better Insights. Faster Decisions.</p>
          <ul className="mt-10 space-y-5">
            {highlights.map((h) => (
              <li key={h.t} className="flex gap-3">
                <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-semibold">{h.t}</p>
                  <p className="text-sm opacity-70">{h.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8"><Logo /></div>
          <p className="eyebrow">{mode === "signup" ? "New here" : mode === "forgot" ? "Password help" : "Sign in"}</p>
          <h1 className="mt-2 text-3xl font-semibold">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subcopy}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={f.name} onChange={set("name")} autoComplete="name" placeholder="Shravani Rao" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@company.com" required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={f.password}
                    onChange={set("password")}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signup" && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={f.confirm}
                    onChange={set("confirm")}
                    autoComplete="new-password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
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
          <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
            <button className="text-accent hover:underline" onClick={() => { setErr(null); setMode(mode === "signup" ? "signin" : "signup"); }}>
              {mode === "signup" ? "Have an account? Sign in" : "Create an account"}
            </button>
            {mode === "signin" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
            {mode === "forgot" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

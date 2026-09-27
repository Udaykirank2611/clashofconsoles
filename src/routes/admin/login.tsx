import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapOwner } from "@/lib/admin.functions";
import { adminSignIn } from "@/lib/security.functions";
import { clientInfo, setSessionId } from "@/lib/admin/sessionTracker";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { AdminButton, AdminInput } from "@/components/admin/primitives";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLogin,
  head: () => ({
    meta: [
      { title: "Admin Login — Clash of Consoles" },
      { name: "description", content: "Secure sign-in for Clash of Consoles branch managers." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Login — Clash of Consoles" },
      { property: "og:description", content: "Secure sign-in for Clash of Consoles branch managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const checkExists = useServerFn(adminExists);
  const bootstrap = useServerFn(bootstrapOwner);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void checkExists().then((exists) => active && setNeedsSetup(!exists));
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin", replace: true });
    });
    return () => {
      active = false;
    };
  }, [checkExists, navigate]);

  const signIn = useServerFn(adminSignIn);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (needsSetup) {
        const res = await bootstrap({ data: { email: email.trim(), password } });
        if (!res.ok) {
          toast.error(res.message ?? "Setup failed.");
          return;
        }
        toast.success("Owner account created.");
        setNeedsSetup(false);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          toast.error("Incorrect email or password.");
          return;
        }
      } else {
        const res = await signIn({ data: { username: email.trim(), password, ...clientInfo() } });
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        const { error } = await supabase.auth.setSession({
          access_token: res.accessToken,
          refresh_token: res.refreshToken,
        });
        if (error) {
          toast.error("Could not start your session. Try again.");
          return;
        }
        setSessionId(res.sessionId ?? null);
      }
      await navigate({ to: "/admin", replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <AmbientBackground />
      <Link
        to="/"
        className="absolute left-5 top-6 z-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground hover:text-cyan"
      >
        <ArrowLeft className="size-3.5" /> Site
      </Link>
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-sm animate-[step-in_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-3xl border border-border bg-surface/70 p-7 backdrop-blur-2xl shadow-[0_40px_120px_-60px_var(--primary)]"
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-primary via-cyan to-violet text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight">
          {needsSetup ? "First-time setup" : "Admin sign in"}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {needsSetup
            ? "Create the owner account for Clash of Consoles. This screen appears only once."
            : "Branch managers only. Each branch has its own login."}
        </p>

        <div className="mt-6 space-y-3">
          <AdminInput label={needsSetup ? "Email" : "Username or email"} value={email} onChange={setEmail} type={needsSetup ? "email" : "text"} placeholder="you@clash.com" />
          <AdminInput label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        </div>

        <div className="mt-6">
          <AdminButton type="submit" variant="primary" disabled={busy} className="w-full py-3">
            {busy ? "Please wait…" : needsSetup ? "Create owner account" : "Sign in"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}

import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const hasAdminCookie = (): boolean => {
  return document.cookie.includes("admin_authorized=true");
};

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (!hasAdminCookie()) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — Suméra Luxe" },
      { name: "description", content: "Sign in to the Suméra Luxe admin dashboard to manage products, orders and settings." },
      { property: "og:title", content: "Sign in — Suméra Luxe" },
      { property: "og:description", content: "Sign in to the Suméra Luxe admin dashboard to manage the store." },
      { property: "og:url", content: "https://sumeraluxe.com/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const captchaRef = useRef<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetCaptcha = () => {
    try {
      captchaRef.current?.resetCaptcha?.();
    } catch (e) {
      // Silently handle reset errors
    }
    setCaptchaToken(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast.error("Please complete the captcha");
      return;
    }

    setBusy(true);
    try {
      // Supabase verifies captcha token on backend automatically when passed
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        options: {
          captchaToken: captchaToken,
        }
      });
      
      if (error) {
        // Reset captcha immediately on error
        resetCaptcha();
        
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Password incorrect");
        } else if (error.message.includes("Captcha") || error.message.includes("already-seen")) {
          toast.error("Captcha verification failed. Please try again");
        } else {
          toast.error(error.message ?? "Something went wrong");
        }
        throw error;
      }
      toast.success("Login successful. Redirecting…");
      navigate({ to: "/admin" });
    } catch (err: any) {
      console.error("Catch error:", err);
      // Error already handled above
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Admin</div>
        <h1 className="mt-2 font-serif text-3xl">Sign in</h1>
        <div className="gold-rule mt-4" />
      </div>
      <form onSubmit={submit} className="mt-10 space-y-4">
        <div className="block">
          <label htmlFor="auth-email" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
          <input id="auth-email" name="email" autoComplete="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-border bg-background px-3 py-2.5" />
        </div>
        <div className="block">
          <label htmlFor="auth-password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</label>
          <input id="auth-password" name="password" autoComplete="current-password" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-border bg-background px-3 py-2.5" />
        </div>
        <div className="flex justify-center py-4">
          <HCaptcha
            ref={captchaRef}
            sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>
        <button type="submit" disabled={busy} className="w-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85 disabled:opacity-50">
          {busy ? "Please wait…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
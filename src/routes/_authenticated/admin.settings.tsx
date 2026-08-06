import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { siteSettingsQuery } from "@/lib/queries";
import type { SiteSettings } from "@/lib/db-types";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { TrackingSettingsSection } from "@/components/admin/tracking-settings-section";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const data = useQuery(siteSettingsQuery()).data;
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  // Client-side gate for UX only — the actual tracking_settings RPCs already
  // enforce has_role(admin) server-side regardless of this check.
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return navigate({ to: "/auth" });
      const { data: allowed, error: roleError } = await supabase.rpc("has_role", {
        _user_id: userRes.user.id,
        _role: "admin",
      });
      if (roleError) {
        toast.error(roleError.message || "Could not verify admin access.");
        return navigate({ to: "/admin" });
      }
      if (!allowed) return navigate({ to: "/admin" });
      setIsAdmin(true);
    })();
  }, [navigate]);

  if (!isAdmin) return null;

  const save = async () => {
    const payload = {
      brand_name: form.brand_name, brand_tagline: form.brand_tagline,
      whatsapp_number: form.whatsapp_number, whatsapp_display: form.whatsapp_display,
      contact_email: form.contact_email, facebook_url: form.facebook_url, instagram_url: form.instagram_url,
      delivery_inside_dhaka: Number(form.delivery_inside_dhaka) || 0,
      delivery_outside_dhaka: Number(form.delivery_outside_dhaka) || 0,
      currency_symbol: form.currency_symbol, about_text: form.about_text,
      gtm_head_snippet: form.gtm_head_snippet ?? null,
      gtm_body_snippet: form.gtm_body_snippet ?? null,
    };
    const { error } = await supabase.from("site_settings" as any).update(payload).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  };

  const set = (k: keyof SiteSettings, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Store Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <F label="Brand Name"><input className={I} value={form.brand_name ?? ""} onChange={(e) => set("brand_name", e.target.value)} /></F>
        <F label="Brand Tagline"><input className={I} value={form.brand_tagline ?? ""} onChange={(e) => set("brand_tagline", e.target.value)} /></F>
        <F label="WhatsApp Number (intl, no +)"><input className={I} value={form.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} /></F>
        <F label="WhatsApp Display"><input className={I} value={form.whatsapp_display ?? ""} onChange={(e) => set("whatsapp_display", e.target.value)} /></F>
        <F label="Contact Email"><input className={I} value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} /></F>
        <F label="Currency Symbol"><input className={I} value={form.currency_symbol ?? ""} onChange={(e) => set("currency_symbol", e.target.value)} /></F>
        <F label="Facebook URL"><input className={I} value={form.facebook_url ?? ""} onChange={(e) => set("facebook_url", e.target.value)} /></F>
        <F label="Instagram URL"><input className={I} value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} /></F>
        <F label="Delivery Inside Dhaka (Tk. )"><input type="number" className={I} value={form.delivery_inside_dhaka ?? 0} onChange={(e) => set("delivery_inside_dhaka", Number(e.target.value))} /></F>
        <F label="Delivery Outside Dhaka (Tk. )"><input type="number" className={I} value={form.delivery_outside_dhaka ?? 0} onChange={(e) => set("delivery_outside_dhaka", Number(e.target.value))} /></F>
        <div className="md:col-span-2">
          <F label="About Text"><textarea className={I + " min-h-32"} value={form.about_text ?? ""} onChange={(e) => set("about_text", e.target.value)} /></F>
        </div>
        <div className="md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="GTM / Tracking Snippet (Head)">
              <textarea
                className={I + " min-h-40 font-mono text-xs"}
                value={form.gtm_head_snippet ?? ""}
                onChange={(e) => set("gtm_head_snippet", e.target.value)}
                placeholder="Paste the script snippets that should load in the head."
              />
            </F>
            <F label="GTM / Tracking Snippet (Body)">
              <textarea
                className={I + " min-h-40 font-mono text-xs"}
                value={form.gtm_body_snippet ?? ""}
                onChange={(e) => set("gtm_body_snippet", e.target.value)}
                placeholder="Paste the noscript or body fallback snippets here."
              />
            </F>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Use this for GTM, GA4, Meta Pixel, and other tracking snippets.
          </p>
        </div>
      </div>
      <button onClick={save} className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background">
        <Save className="size-3" /> Save Settings
      </button>

      <TrackingSettingsSection />
    </div>
  );
}

const I = "w-full border border-border bg-background px-3 py-2 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>{children}</label>;
}
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, ShieldCheck } from "lucide-react";

type TrackingSettingsRow = {
  meta_pixel_id: string | null;
  meta_capi_enabled: boolean;
  meta_test_event_code: string | null;
  has_access_token: boolean;
};

const trackingSettingsQuery = () =>
  queryOptions({
    queryKey: ["tracking-settings"],
    queryFn: async (): Promise<TrackingSettingsRow | null> => {
      const { data, error } = await supabase.rpc("admin_get_tracking_settings");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as TrackingSettingsRow) ?? null;
    },
  });

const MASKED_TOKEN_PLACEHOLDER = "••••••••••••••••";

export function TrackingSettingsSection() {
  const qc = useQueryClient();
  const { data, isPending, isError, error } = useQuery(trackingSettingsQuery());

  const [pixelId, setPixelId] = useState("");
  const [capiEnabled, setCapiEnabled] = useState(false);
  const [testEventCode, setTestEventCode] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPixelId(data.meta_pixel_id ?? "");
    setCapiEnabled(Boolean(data.meta_capi_enabled));
    setTestEventCode(data.meta_test_event_code ?? "");
    setHasStoredToken(Boolean(data.has_access_token));
  }, [data]);

  useEffect(() => {
    if (isError) toast.error(error instanceof Error ? error.message : "Could not load tracking settings.");
  }, [isError, error]);

  const pixelIdValid = pixelId.trim().length === 0 || /^\d{5,20}$/.test(pixelId.trim());

  const save = async () => {
    if (!pixelId.trim()) return toast.error("Meta Pixel ID is required.");
    if (!pixelIdValid) return toast.error("Meta Pixel ID must contain only digits.");
    if (capiEnabled && !hasStoredToken && !accessToken.trim()) {
      return toast.error("Add a Meta CAPI access token before enabling CAPI.");
    }

    setSaving(true);
    const { error } = await supabase.rpc("admin_save_tracking_settings", {
      _meta_pixel_id: pixelId.trim(),
      _meta_capi_enabled: capiEnabled,
      _meta_test_event_code: testEventCode.trim() || null,
      _meta_access_token: accessToken.trim() || null,
    });
    setSaving(false);

    if (error) return toast.error(error.message);

    toast.success("Tracking settings saved");
    setAccessToken("");
    qc.invalidateQueries({ queryKey: ["tracking-settings"] });
  };

  return (
    <div className="border-t border-border pt-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-gold" />
        <h2 className="font-serif text-2xl">Tracking Settings</h2>
      </div>
      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Meta Conversions API · server-side event forwarding for Purchase, InitiateCheckout, AddToCart, ViewContent.
      </p>

      {isPending ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-sm bg-muted/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 text-sm text-destructive">
          Could not load tracking settings. You may not have admin access, or the connection failed.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Meta Pixel ID</div>
          <input
            className={`w-full border bg-background px-3 py-2 text-sm ${pixelIdValid ? "border-border" : "border-destructive"}`}
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="123456789012345"
          />
          {!pixelIdValid && <p className="mt-1 text-xs text-destructive">Digits only.</p>}
        </label>

        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Meta CAPI Access Token {hasStoredToken && <span className="text-gold">(saved)</span>}
          </div>
          <input
            type="password"
            className="w-full border border-border bg-background px-3 py-2 text-sm"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={hasStoredToken ? MASKED_TOKEN_PLACEHOLDER : "Enter access token"}
            autoComplete="new-password"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Leave blank to keep the current token. Never shown or sent back to the browser.
          </p>
        </label>

        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Test Event Code (optional)</div>
          <input
            className="w-full border border-border bg-background px-3 py-2 text-sm"
            value={testEventCode}
            onChange={(e) => setTestEventCode(e.target.value)}
            placeholder="TEST12345"
          />
        </label>

        <div className="flex items-center gap-3 pt-6">
          <Switch checked={capiEnabled} onCheckedChange={setCapiEnabled} />
          <span className="text-sm">Enable Meta CAPI</span>
        </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background disabled:opacity-60"
          >
            <Save className="size-3" /> {saving ? "Saving…" : "Save Tracking Settings"}
          </button>
        </>
      )}
    </div>
  );
}

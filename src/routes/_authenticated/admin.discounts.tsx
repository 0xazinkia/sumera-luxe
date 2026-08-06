import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { discountCodesQuery } from "@/lib/queries";
import type { DiscountCode } from "@/lib/db-types";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/discounts")({
  component: DiscountsAdmin,
});

const blank: Partial<DiscountCode> = {
  code: "", type: "percent", value: 10, min_subtotal: 0, max_uses: null, expires_at: null, is_active: true,
};

function DiscountsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery(discountCodesQuery());
  const codes = data ?? [];
  const [draft, setDraft] = useState<Partial<DiscountCode> | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["discount-codes"] });

  const save = async () => {
    if (!draft?.code) return toast.error("Code required");
    const payload = {
      code: draft.code.trim().toUpperCase(),
      type: draft.type ?? "percent",
      value: Number(draft.value) || 0,
      min_subtotal: Number(draft.min_subtotal) || 0,
      max_uses: draft.max_uses != null && (draft.max_uses as any) !== "" ? Number(draft.max_uses) : null,
      expires_at: draft.expires_at || null,
      is_active: draft.is_active ?? true,
    };
    const q = draft.id
      ? supabase.from("discount_codes" as any).update(payload as any).eq("id", draft.id)
      : supabase.from("discount_codes" as any).insert(payload as any);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setDraft(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this code?")) return;
    const { error } = await supabase.from("discount_codes" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const toggle = async (c: DiscountCode) => {
    const { error } = await supabase.from("discount_codes" as any).update({ is_active: !c.is_active } as any).eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Discount Codes</h1>
        <button onClick={() => setDraft({ ...blank })} className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-background">
          <Plus className="size-3" /> New code
        </button>
      </div>

      {draft && (
        <div className="grid gap-3 border border-border bg-card p-4 md:grid-cols-3">
          <F label="Code"><input className={I} value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></F>
          <F label="Type">
            <select className={I} value={draft.type ?? "percent"} onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}>
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (Tk. )</option>
            </select>
          </F>
          <F label="Value"><input type="number" className={I} value={draft.value ?? 0} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} /></F>
          <F label="Minimum Subtotal (Tk. )"><input type="number" className={I} value={draft.min_subtotal ?? 0} onChange={(e) => setDraft({ ...draft, min_subtotal: Number(e.target.value) })} /></F>
          <F label="Max Uses (blank = unlimited)"><input type="number" className={I} value={draft.max_uses ?? ""} onChange={(e) => setDraft({ ...draft, max_uses: e.target.value === "" ? null : Number(e.target.value) })} /></F>
          <F label="Expires At"><input type="datetime-local" className={I} value={draft.expires_at ? String(draft.expires_at).slice(0, 16) : ""} onChange={(e) => setDraft({ ...draft, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></F>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active
          </label>
          <div className="flex items-center gap-3 md:col-span-2">
            <button onClick={save} className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-background"><Save className="size-3" /> Save</button>
            <button onClick={() => setDraft(null)} className="text-xs text-muted-foreground underline">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Discount</th>
              <th className="py-2 pr-3">Min</th>
              <th className="py-2 pr-3">Used</th>
              <th className="py-2 pr-3">Expires</th>
              <th className="py-2 pr-3">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-border/60">
                <td className="py-2 pr-3 font-mono text-xs">{c.code}</td>
                <td className="py-2 pr-3">{c.type === "percent" ? `${Number(c.value)}%` : `Tk. ${Number(c.value)}`}</td>
                <td className="py-2 pr-3">Tk. {Number(c.min_subtotal)}</td>
                <td className="py-2 pr-3">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                <td className="py-2 pr-3 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td className="py-2 pr-3">
                  <button onClick={() => toggle(c)} className="text-xs underline">{c.is_active ? "Active" : "Inactive"}</button>
                </td>
                <td className="py-2 pr-3 text-right">
                  <button onClick={() => setDraft(c)} className="mr-3 text-xs underline">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-destructive"><Trash2 className="inline size-3" /></button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No discount codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const I = "w-full border border-border bg-background px-3 py-2 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>{children}</label>;
}
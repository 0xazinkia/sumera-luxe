import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { deleteLocalUploads, isLocalUploadUrl, uploadOptimizedImage } from "@/lib/image-upload";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersAdmin,
});

type Banner = {
  id: string;
  slot: string;
  image_url: string;
  mobile_image_url: string | null;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

const allBannersQuery = () => ({
  queryKey: ["admin", "banners"],
  queryFn: async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from("banners" as any).select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as any as Banner[];
  },
});

function BannersAdmin() {
  const qc = useQueryClient();
  const items = useQuery(allBannersQuery()).data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<Partial<Banner>>({ slot: "promo", image_url: "", mobile_image_url: "", eyebrow: "", title: "", subtitle: "", cta_label: "", cta_href: "", is_active: true, sort_order: items.length + 1 });
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingMobileImageFile, setPendingMobileImageFile] = useState<File | null>(null);
  const [resetDesktopImage, setResetDesktopImage] = useState(false);
  const [resetMobileImage, setResetMobileImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "banners"] }).then(() => qc.invalidateQueries({ queryKey: ["banners"] }));

  const openCreateDialog = () => {
    setEditingBanner(null);
    setForm({ slot: "promo", image_url: "", mobile_image_url: "", eyebrow: "", title: "", subtitle: "", cta_label: "", cta_href: "", is_active: true, sort_order: items.length + 1 });
    setPendingImageFile(null);
    setPendingMobileImageFile(null);
    setResetDesktopImage(false);
    setResetMobileImage(false);
    setDialogOpen(true);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      slot: banner.slot,
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url ?? "",
      eyebrow: banner.eyebrow ?? "",
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      cta_label: banner.cta_label ?? "",
      cta_href: banner.cta_href ?? "",
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    });
    setPendingImageFile(null);
    setPendingMobileImageFile(null);
    setResetDesktopImage(false);
    setResetMobileImage(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBanner(null);
    setPendingImageFile(null);
    setPendingMobileImageFile(null);
  };

  const handleImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingImageFile(file);
    setResetDesktopImage(false);
    toast.success("Image selected — it will be saved when you click Save");
    event.target.value = "";
  };

  const handleMobileImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingMobileImageFile(file);
    setResetMobileImage(false);
    toast.success("Mobile image selected — it will be saved when you click Save");
    event.target.value = "";
  };

  const save = async () => {
    if (!form.slot?.trim()) return toast.error("Slot required");

    const oldDesktopUrl = editingBanner?.image_url;
    const oldMobileUrl = editingBanner?.mobile_image_url;
    const deleteOldUrls: string[] = [];

    let imageUrl = form.image_url?.trim() || null;
    let mobileImageUrl = form.mobile_image_url?.trim() || null;
    if (pendingImageFile) {
      setSaving(true);
      try {
        const result = await uploadOptimizedImage(pendingImageFile, {
          folder: "banners",
          prefix: `${form.slot.trim()}-desktop`,
        });
        imageUrl = result.url;
        if (isLocalUploadUrl(oldDesktopUrl) && oldDesktopUrl !== result.url) {
          deleteOldUrls.push(oldDesktopUrl);
        }
      } finally {
        setSaving(false);
      }
    }
    if (pendingMobileImageFile) {
      setSaving(true);
      try {
        const result = await uploadOptimizedImage(pendingMobileImageFile, {
          folder: "banners",
          prefix: `${form.slot.trim()}-mobile`,
        });
        mobileImageUrl = result.url;
        if (isLocalUploadUrl(oldMobileUrl) && oldMobileUrl !== result.url) {
          deleteOldUrls.push(oldMobileUrl);
        }
      } finally {
        setSaving(false);
      }
    }

    // If the user cleared the image(s) in the editor, schedule deletion of the old local files
    if (resetDesktopImage && isLocalUploadUrl(oldDesktopUrl) && oldDesktopUrl !== imageUrl) {
      deleteOldUrls.push(oldDesktopUrl);
    }
    if (resetMobileImage && isLocalUploadUrl(oldMobileUrl) && oldMobileUrl !== mobileImageUrl) {
      deleteOldUrls.push(oldMobileUrl);
    }

    if (!imageUrl) return toast.error("Image required");

    const payload = {
      slot: form.slot.trim(),
      image_url: imageUrl,
      mobile_image_url: mobileImageUrl,
      eyebrow: form.eyebrow?.trim() || null,
      title: form.title?.trim() || null,
      subtitle: form.subtitle?.trim() || null,
      cta_label: form.cta_label?.trim() || null,
      cta_href: form.cta_href?.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };

    if (editingBanner) {
      const { error } = await supabase.from("banners" as any).update(payload).eq("id", editingBanner.id);
      if (error) return toast.error(error.message);
      toast.success("Banner updated");
    } else {
      const { error } = await supabase.from("banners" as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Banner added");
    }

    if (deleteOldUrls.length) {
      deleteLocalUploads(deleteOldUrls).catch(() => {
        console.warn("Failed to delete old local banner image(s)", deleteOldUrls);
      });
    }

    setPendingImageFile(null);
    setPendingMobileImageFile(null);
    closeDialog();
    refresh();
  };

  const remove = async (s: Banner) => {
    if (!confirm("Delete banner?")) return;
    const { error } = await supabase.from("banners" as any).delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    const localUrls = [s.image_url, s.mobile_image_url].filter(isLocalUploadUrl);
    if (localUrls.length) {
      deleteLocalUploads(localUrls).catch(() => {
        console.warn("Failed to delete local banner images", localUrls);
      });
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Promotional Banners</h1>
          <p className="mt-1 text-xs text-muted-foreground">Common slots: home-promo, home-secondary</p>
        </div>
        <button onClick={openCreateDialog} className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background">
          <Plus className="size-3" /> Add Banner
        </button>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-3 py-2">Banner</th>
              <th className="px-3 py-2">Slot</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{s.title || "Untitled"}</div>
                      <div className="text-xs text-muted-foreground">{s.eyebrow || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{s.slot}</td>
                <td className="px-3 py-2">{s.sort_order}</td>
                <td className="px-3 py-2">{s.is_active ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditDialog(s)} className="inline-flex items-center gap-1 border border-border px-3 py-1 text-xs">
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button onClick={() => remove(s)} className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-1 text-xs text-destructive">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No banners yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "New Banner"}</DialogTitle>
            <DialogDescription>Manage the banner content and save when you are ready.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slot">
              <input className={I} value={form.slot ?? ""} onChange={(e) => setForm((p) => ({ ...p, slot: e.target.value }))} />
            </Field>
            <Field label="Image (Required, 1200x380)">
              <div className="space-y-2">
                <input id="banner-image-input" type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                <button type="button" onClick={() => document.getElementById("banner-image-input")?.click()} className="inline-flex items-center gap-1 bg-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] text-background">
                  <Upload className="size-3" /> Pick file
                </button>
                <button type="button" onClick={() => { setPendingImageFile(null); setForm((p) => ({ ...p, image_url: "" })); setResetDesktopImage(true); toast.success("Image cleared — it will be removed when you click Save"); }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                  <Trash2 className="size-3" /> Clear
                </button>
                {pendingImageFile && <p className="text-xs text-muted-foreground">New image selected — it will be saved with the banner.</p>}
                {form.image_url ? <img src={form.image_url} alt="Banner preview" className="h-24 w-full rounded object-cover" /> : null}
              </div>
            </Field>
            <Field label="Mobile Image (Optional, 700x550)">
              <div className="space-y-2">
                <input id="banner-mobile-image-input" type="file" accept="image/*" className="hidden" onChange={handleMobileImagePick} />
                <button type="button" onClick={() => document.getElementById("banner-mobile-image-input")?.click()} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                  <Upload className="size-3" /> Pick file
                </button>
                <button type="button" onClick={() => { setPendingMobileImageFile(null); setForm((p) => ({ ...p, mobile_image_url: "" })); setResetMobileImage(true); toast.success("Mobile image cleared — it will be removed when you click Save"); }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                  <Trash2 className="size-3" /> Clear
                </button>
                {pendingMobileImageFile && <p className="text-xs text-muted-foreground">New mobile image selected — it will be saved with the banner.</p>}
                {form.mobile_image_url ? <img src={form.mobile_image_url} alt="Banner mobile preview" className="h-24 w-full rounded object-cover" /> : null}
              </div>
            </Field>
            <Field label="Eyebrow (Optional)">
              <input className={I} value={form.eyebrow ?? ""} onChange={(e) => setForm((p) => ({ ...p, eyebrow: e.target.value }))} />
            </Field>
            <Field label="Title (Optional)">
              <input className={I} value={form.title ?? ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </Field>
            <Field label="Subtitle (Optional)">
              <input className={I} value={form.subtitle ?? ""} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
            </Field>
            <Field label="CTA Label (Optional)">
              <input className={I} value={form.cta_label ?? ""} onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))} />
            </Field>
            <Field label="CTA Link (Optional)">
              <input className={I} value={form.cta_href ?? ""} onChange={(e) => setForm((p) => ({ ...p, cta_href: e.target.value }))} />
            </Field>
            <Field label="Order">
              <input type="number" className={I} value={form.sort_order ?? 0} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
              Active
            </label>
          </div>

          <DialogFooter className="sm:justify-end">
            <button type="button" onClick={closeDialog} className="border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const I = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>{children}</label>;
}
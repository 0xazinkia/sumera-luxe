import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/queries";
import type { Category } from "@/lib/db-types";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Image as ImageIcon, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { deleteLocalUploads, isLocalUploadUrl, uploadOptimizedImage } from "@/lib/image-upload";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

type CategoryFormState = {
  name: string;
  slug: string;
  tagline: string;
  image_url: string;
  sort_order: number;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function emptyForm(sortOrder: number): CategoryFormState {
  return { name: "", slug: "", tagline: "", image_url: "", sort_order: sortOrder };
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery()).data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm(0));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingCategoryImageFile, setPendingCategoryImageFile] = useState<File | null>(null);
  const [resetCategoryImage, setResetCategoryImage] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(emptyForm(cats.length + 1));
    setResetCategoryImage(false);
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      tagline: category.tagline ?? "",
      image_url: category.image_url ?? "",
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
    setResetCategoryImage(false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingCategoryImageFile(file);
    setResetCategoryImage(false);
    toast.success("Image selected — it will be saved when you click Save");
    event.target.value = "";
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");

    setUploadingImage(true);
    try {
      const name = form.name.trim();
      const slug = (form.slug || slugify(name)).trim();
      let imageUrl = form.image_url.trim() || null;
      const deleteOldUrls: string[] = [];

      if (pendingCategoryImageFile) {
        const result = await uploadOptimizedImage(pendingCategoryImageFile, {
          folder: "category-images",
          prefix: slug || "category",
        });
        if (isLocalUploadUrl(form.image_url) && form.image_url !== result.url) {
          deleteOldUrls.push(form.image_url);
        }
        imageUrl = result.url;
      }

      // If user cleared the image in the editor, schedule deletion after DB update
      if (resetCategoryImage && editingCategory && isLocalUploadUrl(editingCategory.image_url) && editingCategory.image_url !== imageUrl) {
        deleteOldUrls.push(editingCategory.image_url);
      }

      const payload = {
        name,
        slug,
        tagline: form.tagline.trim() || null,
        image_url: imageUrl,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editingCategory) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        toast.success("Category created");
      }

      // perform deferred deletions for local files
      if (deleteOldUrls.length) {
        deleteLocalUploads(deleteOldUrls).catch(() => {
          console.warn("Failed to delete old local category image(s)", deleteOldUrls);
        });
      }

      setPendingCategoryImageFile(null);
      closeDialog();
      refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save");
    } finally {
      setUploadingImage(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"? Products in it will be uncategorized.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    const localUrls = [c.image_url].filter(isLocalUploadUrl);
    if (localUrls.length) {
      deleteLocalUploads(localUrls).catch(() => {
        console.warn("Failed to delete local category image", localUrls);
      });
    }
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Categories</h1>
        <button onClick={openCreateDialog} className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background">
          <Plus className="size-3" /> Add Category
        </button>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Tagline</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">/{c.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.tagline || "—"}</td>
                <td className="px-3 py-2">{c.sort_order}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditDialog(c)} className="inline-flex items-center gap-1 border border-border px-3 py-1 text-xs">
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button onClick={() => remove(c)} className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-1 text-xs text-destructive">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cats.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No categories yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Fill in the details below and save when you are ready.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
              />
            </Field>
            <Field label="Slug">
              <input className={inputCls} value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
            </Field>
            <Field label="Tagline">
              <input className={inputCls} value={form.tagline} onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))} />
            </Field>
            <Field label="Image">
              <div className="space-y-2">
                <input type="file" accept="image/*" className={inputCls} onChange={handleImagePick} />
                {uploadingImage && <p className="text-xs text-muted-foreground">Saving image…</p>}
                {pendingCategoryImageFile && <p className="text-xs text-muted-foreground">New image selected — it will be saved with the category.</p>}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setForm((prev) => ({ ...prev, image_url: "" })); setResetCategoryImage(true); toast.success("Image cleared — it will be removed when you click Save"); }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                    <Trash2 className="size-3" /> Clear
                  </button>
                  <button type="button" onClick={() => document.getElementById("category-image-input")?.click()} className="inline-flex items-center gap-1 bg-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] text-background">
                    <Upload className="size-3" /> Pick file
                  </button>
                </div>
                {form.image_url ? (
                  <img src={form.image_url} alt="Category preview" className="h-24 w-full rounded object-cover" />
                ) : null}
                <input id="category-image-input" type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              </div>
            </Field>
            <Field label="Order">
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              />
            </Field>
          </div>

          <DialogFooter className="sm:justify-end">
            <button type="button" onClick={closeDialog} className="border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">
              Cancel
            </button>
            <button type="button" onClick={save} className="bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
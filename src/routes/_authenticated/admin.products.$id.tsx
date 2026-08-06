import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import type { Product, ProductImage, Variant } from "@/lib/db-types";
import { toast } from "sonner";
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2, Pencil, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { deleteLocalUploads, isLocalUploadUrl, uploadFile, uploadOptimizedImage } from "@/lib/image-upload";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: ProductEditor,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const emptyProduct: Partial<Product> = {
  name: "", slug: "", brand_name: "", description: "", video_url: "", size_chart_url: null,
  base_price: 0, discount_price: null, stock: 0, is_featured: false, is_new: false, sort_order: 0, category_id: null,
  images: [], variants: [],
};

type ProductMode = "single" | "variant";

function ProductEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const qc = useQueryClient();
  const nav = useNavigate();
  const categories = useQuery(categoriesQuery()).data ?? [];
  const productsData = useQuery(productsQuery()).data ?? [];
  const existing = !isNew ? productsData.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const [images, setImages] = useState<Partial<ProductImage>[]>([]);
  const [variants, setVariants] = useState<Partial<Variant>[]>([]);
  const [productMode, setProductMode] = useState<ProductMode>("single");
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState<Partial<Variant>>({ color: "", size: "", price: 0, discount_price: null, image_url: "", stock: 0 });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingProductImageFiles, setPendingProductImageFiles] = useState<Map<number, File>>(new Map());
  const [pendingSizeChartFile, setPendingSizeChartFile] = useState<File | null>(null);
  const lastVariantColorRef = useRef<string | null>(null);
  const immediateUploadedVariantUrls = useRef<Set<string>>(new Set());
  const latestVariantsRef = useRef<Partial<Variant>[]>([]);

  const isVariantExisting = !isNew && ((existing?.variants?.length ?? 0) > 0);

  useEffect(() => {
    if (existing) {
      const nextVariants = existing.variants ?? [];
      setForm(existing);
      setImages(existing.images);
      setVariants(nextVariants);
      latestVariantsRef.current = nextVariants;
      setProductMode((existing.variants?.length ?? 0) > 0 ? "variant" : "single");
    } else {
      setForm(emptyProduct);
      setImages([]);
      setVariants([]);
      latestVariantsRef.current = [];
      setProductMode("single");
    }
  }, [existing?.id, isNew]);

  useEffect(() => {
    latestVariantsRef.current = variants;
  }, [variants]);

  const set = (k: keyof Product, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const emptyVariantForm = (): Partial<Variant> => ({ color: "", size: "", price: 0, discount_price: null, image_url: "", stock: 0 });

  const openAddVariantDialog = () => {
    setEditingVariantIndex(null);
    const lastVariant = variants[variants.length - 1];
    lastVariantColorRef.current = lastVariant?.color ?? null;
    setVariantForm(lastVariant ? {
      color: lastVariant.color ?? "",
      size: "",
      price: lastVariant.price ?? 0,
      discount_price: lastVariant.discount_price ?? null,
      image_url: lastVariant.image_url ?? "",
      stock: lastVariant.stock ?? 0,
    } : emptyVariantForm());
    setVariantDialogOpen(true);
  };

  const openEditVariantDialog = (index: number) => {
    setEditingVariantIndex(index);
    setVariantForm(variants[index] ?? emptyVariantForm());
    setVariantDialogOpen(true);
  };

  const closeVariantDialog = () => {
    setVariantDialogOpen(false);
    setEditingVariantIndex(null);
  };

  const getVariantDraft = (draftForm: Partial<Variant> = variantForm, currentVariants: Partial<Variant>[] = variants) => {
    const cleaned: Partial<Variant> = {
      color: draftForm.color?.trim(),
      size: draftForm.size?.trim() || null,
      price: Number(draftForm.price) || 0,
      discount_price: draftForm.discount_price != null && draftForm.discount_price !== ("" as any) ? Number(draftForm.discount_price) : null,
      image_url: draftForm.image_url?.trim() || null,
      stock: Number(draftForm.stock) || 0,
      sort_order: editingVariantIndex != null ? currentVariants[editingVariantIndex]?.sort_order ?? editingVariantIndex : currentVariants.length,
    };

    return editingVariantIndex != null
      ? currentVariants.map((v, i) => (i === editingVariantIndex ? { ...currentVariants[i], ...cleaned } : v))
      : [...currentVariants, cleaned];
  };

  const getActiveVariants = (draftForm?: Partial<Variant>) => {
    const baseVariants = latestVariantsRef.current.length ? latestVariantsRef.current : variants;
    if (draftForm && variantDialogOpen && draftForm.color?.trim()) {
      const nextVariants = getVariantDraft(draftForm, baseVariants);
      latestVariantsRef.current = nextVariants;
      setVariants(nextVariants);
      return nextVariants;
    }
    return baseVariants;
  };

  const saveVariant = () => {
    if (!variantForm.color?.trim()) {
      return toast.error("Color is required");
    }
    getActiveVariants(variantForm);
    closeVariantDialog();
  };

  const removeVariant = (index: number) => {
    const removedVariant = variants[index];
    const nextVariants = variants.filter((_, j) => j !== index);
    latestVariantsRef.current = nextVariants;
    setVariants(nextVariants);

    if (removedVariant?.image_url && isLocalUploadUrl(removedVariant.image_url)) {
      immediateUploadedVariantUrls.current.delete(removedVariant.image_url);
      immediateUploadedVariantUrls.current.add(removedVariant.image_url);
    }
  };

  const handleProductModeChange = (mode: ProductMode) => {
    if (mode === "single" && isVariantExisting) {
      toast.error("Cannot switch to single product while editing a product with variants");
      return;
    }
    setProductMode(mode);
    if (mode === "single") {
      setVariants([]);
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImages(next.map((img, idx) => ({ ...img, sort_order: idx })));
  };

  const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>, target: "product" | "variant", index?: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (target === "variant") {
      // upload immediately so each variant keeps its own image instead of sharing one deferred file
      setUploadingImage(true);
      try {
        const result = await uploadOptimizedImage(file, {
          folder: "variant-images",
          prefix: variantForm.color || "variant",
        });
        setVariantForm((prev) => ({ ...prev, image_url: result.url }));
        // track immediate uploads so we can clean them later if the user clears before saving
        immediateUploadedVariantUrls.current.add(result.url);
        toast.success("Image uploaded");
      } catch (e: any) {
        toast.error(e.message ?? "Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    } else if (index != null) {
      setPendingProductImageFiles((prev) => new Map(prev).set(index, file));
      toast.success("Image selected — it will be saved when you click Save");
    }
  };

  const handleSizeChartPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingSizeChartFile(file);
    toast.success("Size chart selected — it will be saved when you click Save");
    event.target.value = "";
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    if (!form.brand_name?.trim()) return toast.error("Brand name required");
    const slug = form.slug || slugify(form.name);
    let uploadedSizeChartUrl = form.size_chart_url?.toString().trim() ? form.size_chart_url.toString().trim() : null;
    if (pendingSizeChartFile) {
      setUploadingImage(true);
      try {
        const result = await uploadFile(pendingSizeChartFile, {
          folder: "size-charts",
          prefix: slug,
        });
        uploadedSizeChartUrl = result.url;
      } finally {
        setUploadingImage(false);
      }
    }

    const payload: {
      name: string;
      slug: string;
      brand_name: string;
      description: string | null;
      video_url: string | null;
      size_chart_url: string | null;
      category_id: string | null;
      base_price: number;
      discount_price: number | null;
      stock: number;
      is_featured: boolean;
      is_new: boolean;
      sort_order: number;
    } = {
      name: form.name.trim(), slug, brand_name: form.brand_name.trim(),
      description: form.description || null,
      video_url: form.video_url?.toString().trim() ? form.video_url.toString().trim() : null,
      size_chart_url: uploadedSizeChartUrl,
      category_id: form.category_id || null,
      base_price: Number(form.base_price) || 0,
      discount_price: form.discount_price != null && form.discount_price !== ("" as any) ? Number(form.discount_price) : null,
      stock: Number(form.stock) || 0,
      is_featured: !!form.is_featured, is_new: !!form.is_new,
      sort_order: Number(form.sort_order) || 0,
    };

    const currentVariants = getActiveVariants(variantDialogOpen ? variantForm : undefined);

    // If this is a variant product, derive some product-level fields from variants
    if (productMode === "variant") {
      const firstVariant = currentVariants.find((v) => v.color) ?? currentVariants[0];
      payload.base_price = Number(firstVariant?.price) || 0;
      payload.discount_price = firstVariant?.discount_price != null && firstVariant?.discount_price !== ("" as any) ? Number(firstVariant?.discount_price) : null;
      payload.stock = currentVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
    }

    const oldLocalUrls = new Set<string>();
    if (!isNew && existing) {
      existing.images.forEach((img) => { if (isLocalUploadUrl(img.url)) oldLocalUrls.add(img.url); });
      if (isLocalUploadUrl(existing.size_chart_url)) oldLocalUrls.add(existing.size_chart_url);
      existing.variants.forEach((variant) => { if (isLocalUploadUrl(variant.image_url)) oldLocalUrls.add(variant.image_url!); });
    }

    setSaving(true);
    try {
      let productId: string | undefined = form.id;
      if (isNew) {
        const { data, error } = await supabase.from("products").insert(payload as any).select("id").single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from("products").update(payload as any).eq("id", productId!);
        if (error) throw error;
      }
      if (!productId) throw new Error("Missing product id");

      const uploadedImages = await Promise.all(
        images.map(async (img, idx) => {
          const pendingFile = pendingProductImageFiles.get(idx);
          if (!pendingFile) return { url: img.url ?? null, alt: img.alt || null, sort_order: img.sort_order ?? idx };
          const result = await uploadOptimizedImage(pendingFile, {
            folder: "product-images",
            prefix: form.slug || slugify(form.name || "product"),
          });
          return { url: result.url, alt: img.alt || null, sort_order: img.sort_order ?? idx };
        }),
      );

      const uploadedVariantImages = productMode === "variant"
        ? currentVariants.map((variant, idx) => ({ ...variant, image_url: variant.image_url ?? null, sort_order: variant.sort_order ?? idx }))
        : [];

      await supabase.from("product_images").delete().eq("product_id", productId!);
      const imgRows = productMode === "variant"
        ? uploadedVariantImages.filter((v) => v.image_url).map((v, idx) => ({ product_id: productId as string, url: v.image_url!, alt: null, sort_order: idx }))
        : uploadedImages.filter((i) => i.url).map((i, idx) => ({ product_id: productId as string, url: i.url!, alt: i.alt || null, sort_order: i.sort_order ?? idx }));
      if (imgRows.length) {
        const { error } = await supabase.from("product_images").insert(imgRows);
        if (error) throw error;
      }

      await supabase.from("product_variants").delete().eq("product_id", productId!);
      const varRows = uploadedVariantImages.filter((v) => v.color).map((v, idx) => ({
        product_id: productId as string, color: v.color!, size: v.size || null,
        price: Number(v.price) || 0,
        discount_price: v.discount_price != null && v.discount_price !== ("" as any) ? Number(v.discount_price) : null,
        image_url: v.image_url || null, stock: Number(v.stock) || 0, sort_order: v.sort_order ?? idx,
      }));
      if (varRows.length) {
        const { error } = await supabase.from("product_variants").insert(varRows);
        if (error) throw error;
      }

      const retainedUrls = new Set<string>([
        ...uploadedImages.filter((i) => i.url).map((i) => i.url!),
        ...uploadedVariantImages.filter((v) => v.image_url).map((v) => v.image_url!),
        ...(uploadedSizeChartUrl ? [uploadedSizeChartUrl] : []),
      ]);
      const urlsToDelete = Array.from(oldLocalUrls).filter((url) => !retainedUrls.has(url));
      // also delete any immediate variant uploads that were uploaded during this edit but not retained
      const orphanedImmediate = Array.from(immediateUploadedVariantUrls.current).filter((u) => !retainedUrls.has(u));
      const allUrlsToDelete = [...urlsToDelete, ...orphanedImmediate];
      if (allUrlsToDelete.length) {
        deleteLocalUploads(allUrlsToDelete).catch(() => {
          console.warn("Failed to delete old local product uploads", allUrlsToDelete);
        });
      }
      immediateUploadedVariantUrls.current = new Set();
      

      setPendingProductImageFiles(new Map());
      setPendingSizeChartFile(null);
      toast.success(isNew ? "Product created" : "Product saved");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      if (isNew) nav({ to: "/admin/products/$id", params: { id: productId! } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && !existing) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Back to products
          </Link>
          <h1 className="mt-2 font-serif text-3xl">{isNew ? "New Product" : form.name}</h1>
        </div>
      </div>

      <section className="border border-border bg-card p-4">
        <h2 className="mb-3 text-sm uppercase tracking-[0.25em] text-gold">Product Type</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition ${productMode === "single" ? "border-foreground bg-foreground/5" : "border-border"} ${isVariantExisting ? "opacity-60 cursor-not-allowed" : ""}`}>
            <input type="radio" name="productType" checked={productMode === "single"} onChange={() => handleProductModeChange("single")} className="mt-1" disabled={isVariantExisting} />
            <span>
              <span className="block font-medium">Single product</span>
              <span className="mt-1 block text-sm text-muted-foreground">One price and stock entry for the whole product.</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition ${productMode === "variant" ? "border-foreground bg-foreground/5" : "border-border"}`}>
            <input type="radio" name="productType" checked={productMode === "variant"} onChange={() => handleProductModeChange("variant")} className="mt-1" />
            <span>
              <span className="block font-medium">Variant product</span>
              <span className="mt-1 block text-sm text-muted-foreground">Set separate options like size or color with their own price and stock.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="mb-3 text-sm uppercase tracking-[0.25em] text-gold">Details</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <F label="Name"><input className={I} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} onBlur={() => { if (!form.slug && form.name) set("slug", slugify(form.name)); }} /></F>
          <F label="Slug"><input className={I} value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></F>
          <F label="Category">
            <select className={I} value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Brand Name"><input required className={I} value={form.brand_name ?? ""} onChange={(e) => set("brand_name", e.target.value)} /></F>
          <F label="Sort Order"><input type="number" className={I} value={form.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} /></F>
          {productMode === "single" ? (
            <>
              <F label="Base Price (Tk. )"><input type="number" className={I} value={form.base_price ?? 0} onChange={(e) => set("base_price", Number(e.target.value))} /></F>
              <F label="Discount Price (Tk. , optional)"><input type="number" className={I} value={form.discount_price ?? ""} onChange={(e) => set("discount_price", e.target.value === "" ? null : Number(e.target.value))} /></F>
              <F label="Stock"><input type="number" className={I} value={form.stock ?? 0} onChange={(e) => set("stock", Number(e.target.value))} /></F>
            </>
          ) : null}
          <div className="flex items-end gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_new} onChange={(e) => set("is_new", e.target.checked)} /> New</label>
          </div>
          <F label="Video Link (YouTube)"><input className={I} placeholder="https://www.youtube.com/watch?v=..." value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} /></F>
          <F label="Size Chart (optional)">
            <div className="space-y-2">
              <input id="size-chart-input" type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleSizeChartPick} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => document.getElementById("size-chart-input")?.click()} className="inline-flex items-center gap-1 bg-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] text-background">
                  <Upload className="size-3" /> Pick file
                </button>
                <button type="button" onClick={() => { set("size_chart_url", null); setPendingSizeChartFile(null); toast.success("Size chart cleared — it will be removed when you click Save"); }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                  <Trash2 className="size-3" /> Clear
                </button>
              </div>
              {pendingSizeChartFile && <p className="text-xs text-muted-foreground">New size chart selected — it will be saved with the product.</p>}
              {form.size_chart_url ? <a href={form.size_chart_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">Current size chart</a> : null}
            </div>
          </F>
          <div className="md:col-span-2">
            <F label="Description"><textarea className={I + " min-h-32"} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></F>
          </div>
        </div>
      </section>

      {productMode === "single" && (
        <section className="border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.25em] text-gold">Images</h2>
            <button onClick={() => setImages([...images, { url: "", alt: "", sort_order: images.length }])} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"><Plus className="size-3" /> Add image</button>
          </div>
          <div className="space-y-3">
            {images.map((img, i) => (
              <div key={i} className="grid gap-3 md:grid-cols-[80px_1fr_1fr_auto]">
                {img.url ? <img src={img.url} alt="" className="h-16 w-16 rounded object-cover" /> : <div className="h-16 w-16 rounded bg-muted" />}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input id={`product-image-${i}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, "product", i)} />
                    <button type="button" onClick={() => document.getElementById(`product-image-${i}`)?.click()} className="inline-flex items-center gap-1 bg-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] text-background">
                      <Upload className="size-3" /> Pick file
                    </button>
                    <button type="button" onClick={() => {
                      setImages(images.map((x, j) => j === i ? { ...x, url: "" } : x));
                      setPendingProductImageFiles((prev) => { const m = new Map(prev); m.delete(i); return m; });
                      toast.success("Image cleared — it will be removed when you click Save");
                    }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]">
                      <Trash2 className="size-3" /> Clear
                    </button>
                    {uploadingImage && <p className="text-xs text-muted-foreground">Saving image…</p>}
                    {pendingProductImageFiles.has(i) && <p className="text-xs text-muted-foreground">New image selected — it will be saved with the product.</p>}
                  </div>
                  <F label="URL"><input className={I} value={img.url ?? ""} onChange={(e) => setImages(images.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} /></F>
                </div>
                <F label="Alt"><input className={I} value={img.alt ?? ""} onChange={(e) => setImages(images.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))} /></F>
                <div className="flex items-end gap-1">
                  <button type="button" title="Move up" disabled={i === 0} onClick={() => moveImage(i, i - 1)} className="border border-border px-2 py-2 text-xs disabled:opacity-30"><ArrowUp className="size-3" /></button>
                  <button type="button" title="Move down" disabled={i === images.length - 1} onClick={() => moveImage(i, i + 1)} className="border border-border px-2 py-2 text-xs disabled:opacity-30"><ArrowDown className="size-3" /></button>
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i).map((x, idx) => ({ ...x, sort_order: idx })))} className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-2 text-xs text-destructive"><Trash2 className="size-3" /></button>
                </div>
              </div>
            ))}
            {images.length === 0 && <p className="text-xs text-muted-foreground">No images. Add one above.</p>}
            {images.length > 1 && <p className="text-xs text-muted-foreground">First image is the main product photo — use the arrows to reorder.</p>}
          </div>
        </section>
      )}

      {productMode === "variant" && (
        <section className="border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm uppercase tracking-[0.25em] text-gold">Variants</h2>
              <p className="text-xs text-muted-foreground">Manage each option using the list below, then save the product.</p>
            </div>
            <button onClick={openAddVariantDialog} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"><Plus className="size-3" /> Add variant</button>
          </div>
          <div className="overflow-x-auto rounded border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.length > 0 ? (
                  variants
                    .map((variant, index) => ({ variant, index }))
                    .sort((a, b) => {
                      const colorA = (a.variant.color ?? "").toLowerCase();
                      const colorB = (b.variant.color ?? "").toLowerCase();
                      if (colorA !== colorB) return colorA.localeCompare(colorB);
                      const sizeA = (a.variant.size ?? "").toLowerCase();
                      const sizeB = (b.variant.size ?? "").toLowerCase();
                      if (sizeA !== sizeB) return sizeA.localeCompare(sizeB);
                      return (a.variant.sort_order ?? a.index) - (b.variant.sort_order ?? b.index);
                    })
                    .map(({ variant: v, index }) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-3 py-2">{v.color || "—"}</td>
                        <td className="px-3 py-2">{v.size || "—"}</td>
                        <td className="px-3 py-2">Tk. {Number(v.price ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2">{v.discount_price != null ? `Tk. ${Number(v.discount_price).toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2">{Number(v.stock ?? 0)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditVariantDialog(index)} className="inline-flex items-center gap-1 border border-border px-3 py-1 text-xs">
                              <Pencil className="size-3" /> Edit
                            </button>
                            <button onClick={() => removeVariant(index)} className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-1 text-xs text-destructive">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No variants yet — add one to start.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Dialog open={variantDialogOpen} onOpenChange={(open) => (open ? setVariantDialogOpen(true) : closeVariantDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVariantIndex != null ? "Edit Variant" : "New Variant"}</DialogTitle>
            <DialogDescription>Provide the variant option, price and stock, then save.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <F label="Color"><input className={I} value={variantForm.color ?? ""} onChange={(e) => {
              const nextColor = e.target.value;
              const shouldClearImage = editingVariantIndex == null && nextColor.trim() !== (lastVariantColorRef.current ?? "").trim();
              setVariantForm((prev) => ({ ...prev, color: nextColor, image_url: shouldClearImage ? "" : prev.image_url }));
            }} /></F>
            <F label="Size"><input className={I} value={variantForm.size ?? ""} onChange={(e) => setVariantForm((prev) => ({ ...prev, size: e.target.value }))} /></F>
            <F label="Price (Tk. )"><input type="number" className={I} value={variantForm.price ?? 0} onChange={(e) => setVariantForm((prev) => ({ ...prev, price: Number(e.target.value) }))} /></F>
            <F label="Discount"><input type="number" className={I} value={variantForm.discount_price ?? ""} onChange={(e) => setVariantForm((prev) => ({ ...prev, discount_price: e.target.value === "" ? null : Number(e.target.value) }))} /></F>
            <F label="Image">
              <div className="space-y-2">
                <input id="variant-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, "variant")} />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => document.getElementById("variant-image-input")?.click()} className="inline-flex items-center gap-1 bg-foreground px-3 py-2 text-xs uppercase tracking-[0.2em] text-background"><Upload className="size-3" /> Pick file</button>
                  <button type="button" onClick={() => { setVariantForm((prev) => ({ ...prev, image_url: "" })); toast.success("Variant image cleared — it will be removed when you click Save"); }} className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]"><Trash2 className="size-3" /> Clear</button>
                </div>
                {uploadingImage && <p className="text-xs text-muted-foreground">Uploading image…</p>}
                {variantForm.image_url ? <img src={variantForm.image_url} alt="Variant preview" className="h-20 w-full rounded object-cover" /> : null}
              </div>
            </F>
            <F label="Stock"><input type="number" className={I} value={variantForm.stock ?? 0} onChange={(e) => setVariantForm((prev) => ({ ...prev, stock: Number(e.target.value) }))} /></F>
          </div>

          <DialogFooter className="sm:justify-end">
            <button type="button" onClick={closeVariantDialog} className="border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">Cancel</button>
            <button type="button" onClick={saveVariant} className="bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6 flex justify-end">
        <button disabled={saving} onClick={save} className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background disabled:opacity-50">
          <Save className="size-3" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

const I = "w-full border border-border bg-background px-3 py-2 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>{children}</label>;
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { productsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Copy, Search } from "lucide-react";
import { deleteLocalUploads, isLocalUploadUrl } from "@/lib/image-upload";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: ProductsAdmin,
});

function ProductsAdmin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const products = useQuery(productsQuery()).data ?? [];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const names = (products as any[])
      .map((p) => p.category?.name)
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index);
    return names.sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products as any[]).filter((p) => {
      const matchesCategory = category === "all" || p.category?.name === category;
      const matchesSearch = !q || p.name?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes its variants and images.`)) return;
    const product = products.find((p: any) => p.id === id);
    const localUrls = [product?.size_chart_url, ...(product?.images ?? []).map((img: any) => img.url), ...(product?.variants ?? []).map((variant: any) => variant.image_url || "")]
      .filter(isLocalUploadUrl);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (localUrls.length) {
      deleteLocalUploads(localUrls).catch(() => {
        console.warn("Failed to delete local product uploads", localUrls);
      });
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const copyProductLink = async (slug: string) => {
    const url = `${window.location.origin}/products/${slug}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Product link copied");
        return;
      }
    } catch {
      // fall back below
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Product link copied");
    } catch {
      toast.error("Could not copy product link");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Products</h1>
        <button onClick={() => nav({ to: "/admin/products/$id", params: { id: "new" } })} className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs uppercase tracking-[0.25em] text-background">
          <Plus className="size-3" /> New Product
        </button>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name"
            className="w-full rounded border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="text-sm text-muted-foreground">Category</label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          >
            <option value="all">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    {p.images[0] && <img src={p.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2">Tk. {Number(p.discount_price ?? p.base_price).toLocaleString()}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{[p.is_featured && "Featured", p.is_new && "New"].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => copyProductLink(p.slug)} className="inline-flex items-center gap-1 border border-border px-3 py-1 text-xs" title="Copy product link">
                      <Copy className="size-3" />
                    </button>
                    <Link to="/admin/products/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 border border-border px-3 py-1 text-xs"><Pencil className="size-3" /> Edit</Link>
                    <button onClick={() => remove(p.id, p.name)} className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-1 text-xs text-destructive"><Trash2 className="size-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No products match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
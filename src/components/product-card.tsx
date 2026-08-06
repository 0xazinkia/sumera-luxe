import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/db-types";
import { siteSettingsQuery } from "@/lib/queries";

export function ProductCard({ product }: { product: Product }) {
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const currency = settings?.currency_symbol ?? "Tk. ";
  const firstVariant = product.variants[0];
  const base = Number(product.base_price);
  const discount = product.discount_price == null ? null : Number(product.discount_price);
  const variantPrice = firstVariant ? Number(firstVariant.price) : base;
  const variantDiscount = firstVariant?.discount_price == null ? null : Number(firstVariant.discount_price);
  const isVariantProduct = product.variants?.length > 0;
  const price = isVariantProduct ? variantDiscount ?? variantPrice : discount ?? base;
  const compare = isVariantProduct ? variantPrice : base;
  const hasDiscount = price < compare;
  const off = hasDiscount ? Math.round(((compare - price) / compare) * 100) : 0;
  const firstImage = product.images[0]?.url ?? firstVariant?.image_url ?? "";

  if (isSettingsLoading) {
    return (
      <div className="group block">
        <div className="relative overflow-hidden rounded-xl bg-muted">
          <div className="aspect-square w-full animate-pulse bg-muted/70" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-muted/70" />
          <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <img
          src={firstImage}
          alt={product.name}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
            −{off}%
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-destructive-foreground">
            Sold out
          </span>
        )}
        <div className="pointer-events-none absolute inset-0 hidden items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
          <span className="rounded-full bg-background px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground">
            View Product
          </span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-serif text-base leading-tight">{product.name}</h3>
        <div className="mt-1 flex items-baseline justify-center gap-2 text-sm">
          {hasDiscount && (
            <span className="text-muted-foreground line-through">
              {currency}
              {base.toLocaleString()}
            </span>
          )}
          <span className="font-medium text-foreground">
            {currency}
            {price.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ShoppingBag, MessageCircle, Zap, Play, X } from "lucide-react";
import { toast } from "sonner";
import { productBySlugQuery, productsQuery, whatsappHrefFor, productEnquiryMessage, siteSettingsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildAddToCartPayload, buildViewItemPayload, requestBeginCheckoutIntent, trackAddToCart, trackViewItem } from "@/tracking";
import type { Variant } from "@/lib/db-types";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.slug],
      queryFn: async () => {
        const { productBySlugQuery } = await import("@/lib/queries");
        return productBySlugQuery(params.slug).queryFn!(undefined as any);
      },
    });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product — Suméra Luxe" }, { name: "robots", content: "noindex" }] };
    const { product } = loaderData;
    const brandName = product.brand_name?.trim() || "Suméra Luxe";
    const desc =
      product.description ??
      `${product.name} at ${brandName} Bangladesh — curated luxury beauty with cash on delivery in Dhaka and nationwide.`;
    const image = product.images[0]?.url;
    const url = `https://sumeraluxe.com/products/${product.slug}`;
    const price = Number(product.discount_price ?? product.base_price);
    return {
      meta: [
        { title: `${product.name} — Buy in Bangladesh | Suméra Luxe` },
        { name: "description", content: desc },
        { property: "og:title", content: `${product.name} — Buy in Bangladesh | Suméra Luxe` },
        { property: "og:description", content: desc },
        { property: "og:locale", content: "en_BD" },
        { property: "product:price:amount", content: price.toFixed(2) },
        { property: "product:price:currency", content: "BDT" },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: desc,
            ...(image ? { image: [image] } : {}),
            brand: { "@type": "Brand", name: brandName },
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "BDT",
              price: price.toFixed(2),
              areaServed: { "@type": "Country", name: "Bangladesh" },
              eligibleRegion: { "@type": "Country", name: "Bangladesh" },
              availability:
                (product.stock ?? 0) > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, item: { "@id": "https://sumeraluxe.com/", name: "Home" } },
              ...(product.category
                ? [
                    { "@type": "ListItem", position: 2, item: { "@id": `https://sumeraluxe.com/category/${product.category.slug}`, name: product.category.name } },
                    { "@type": "ListItem", position: 3, item: { "@id": url, name: product.name } },
                  ]
                : [{ "@type": "ListItem", position: 2, item: { "@id": url, name: product.name } }]),
            ],
          }),
        },
      ],
    };
  },
  component: ProductDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">Product not found</h1>
      <Link to={"/products" as any} className="mt-6 inline-block underline">Back to shop</Link>
    </div>
  ),
});

type GalleryItem = {
  type: "image" | "video";
  src: string;
  videoId?: string;
};

function getYouTubeVideoId(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(raw: string | null | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const videoId = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
      if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1&mute=1`;
    }
    if (host === "youtube-nocookie.com") {
      return value;
    }
  } catch {
    // fall back to the original string if it already looks like an embed URL
    if (value.includes("youtube.com/embed/") || value.includes("youtube-nocookie.com/embed/")) {
      return value;
    }
  }

  return null;
}

function ProductDetail() {
  const { product: initial } = Route.useLoaderData();
  const { data: fresh } = useQuery(productBySlugQuery(initial.slug));
  const product = fresh ?? initial;
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const currency = settings?.currency_symbol ?? "Tk. ";
  const brand = settings?.brand_name ?? "Suméra Luxe";
  const productBrand = product.brand_name?.trim() || brand;
  const waNumber = settings?.whatsapp_number ?? "8801322126233";

  const cart = useCart();
  const navigate = useNavigate();
  const allProducts = useQuery(productsQuery()).data ?? [];

  const colors = useMemo<string[]>(
    () => Array.from(new Set(product.variants.map((v: Variant) => v.color).filter(Boolean))),
    [product.variants]
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const hasColorOptions = colors.length > 0;
  const sizes = useMemo<string[]>(
    () => {
      const filtered = hasColorOptions
        ? product.variants.filter((v: Variant) => v.color === selectedColor)
        : product.variants;
      return Array.from(new Set(filtered.map((v: Variant) => v.size).filter((s): s is string => Boolean(s))));
    },
    [product.variants, selectedColor, hasColorOptions]
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const variant = useMemo<Variant | undefined>(() => {
    if (hasColorOptions && !selectedColor) return undefined;
    if (sizes.length > 0 && !selectedSize) return undefined;
    return product.variants.find((v: Variant) => {
      if (hasColorOptions && v.color !== selectedColor) return false;
      if (sizes.length > 0 && v.size !== selectedSize) return false;
      return true;
    });
  }, [product.variants, selectedColor, selectedSize, hasColorOptions, sizes.length]);
  const videoUrl = useMemo(() => getYouTubeEmbedUrl(product.video_url), [product.video_url]);
  
  const gallery = useMemo<GalleryItem[]>(() => {
    const baseImages = product.images.map((i: { url: string }) => i.url).filter(Boolean);
    
    // Collect every distinct variant image so all uploaded pictures (per size/color) are browsable
    const allVariantImages = product.variants
      .filter((v: Variant) => v.color && v.image_url)
      .map((v: Variant) => v.image_url!);

    // Combine all images into gallery
    const seenUrls = new Set<string>();
    const allImages = [...allVariantImages, ...baseImages].filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });

    const items: GalleryItem[] = [];
    if (videoUrl) {
      const videoId = getYouTubeVideoId(videoUrl);
      items.push({ type: "video", src: videoUrl, videoId: videoId ?? undefined });
    }

    const seenUrls2 = new Set<string>();
    allImages.forEach((url) => {
      if (!url || seenUrls2.has(url)) return;
      seenUrls2.add(url);
      items.push({ type: "image", src: url });
    });

    return items;
  }, [product.variants, product.images, videoUrl]);

  // Determine main image based on color selection
  const mainImageUrl = useMemo<string | null>(() => {
    if (selectedColor) {
      const colorImages = product.variants
        .filter((v: Variant) => v.color === selectedColor && v.image_url)
        .map((v: Variant) => v.image_url!);
      if (colorImages.length > 0) {
        return colorImages[0];
      }
    }
    return product.images[0]?.url ?? null;
  }, [selectedColor, product.variants, product.images]);

  const [activeMedia, setActiveMedia] = useState<GalleryItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [cartAddedOpen, setCartAddedOpen] = useState(false);
  const [cartAddedImage, setCartAddedImage] = useState<string | null>(null);

  const openImageModal = (src: string) => {
    setModalImage(src);
    setImageModalOpen(true);
  };

  useEffect(() => {
    if (!selectedColor) {
      setSelectedSize(undefined);
    }
  }, [selectedColor]);

  useEffect(() => {
    if (selectedColor && sizes.length === 0) {
      setSelectedSize(undefined);
    }
  }, [sizes, selectedColor]);

  useEffect(() => {
    if (gallery.length === 0) {
      setActiveMedia(null);
      return;
    }
    setActiveMedia((current) => {
      if (current && gallery.some((item) => item.type === current.type && item.src === current.src)) {
        return current;
      }
      return gallery[0];
    });
  }, [gallery]);

  useEffect(() => {
    if (mainImageUrl && selectedColor) {
      const imageItem = gallery.find((item) => item.type === "image" && item.src === mainImageUrl);
      if (imageItem) {
        setActiveMedia(imageItem);
      }
    }
  }, [mainImageUrl, selectedColor, gallery]);

  const basePrice = Number(product.base_price);
  const productDiscount = product.discount_price == null ? null : Number(product.discount_price);
  const variantPrice = variant ? Number(variant.price) : undefined;
  const variantDiscount = variant && variant.discount_price != null ? Number(variant.discount_price) : undefined;
  const price = variantDiscount ?? variantPrice ?? (productDiscount ?? basePrice);
  const compare = variant ? (variantPrice ?? basePrice) : basePrice;
  const hasDiscount = price < compare;
  const stock = variant?.stock ?? product.stock;
  const lowStock = stock > 0 && stock < 10;
  const almostSoldOut = stock > 0 && stock < 5;
  const [copied, setCopied] = useState(false);
  const [qty, setQty] = useState(1);
  const viewItemTrackedRef = useRef<string | null>(null);

  const productUrl = typeof window !== "undefined" ? window.location.href : "";
  const waMsg = productEnquiryMessage(brand, product.name, productUrl);

  useEffect(() => {
    if (!product?.id || viewItemTrackedRef.current === product.id) return;

    viewItemTrackedRef.current = product.id;
    trackViewItem(
      buildViewItemPayload(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
        },
        price,
        brand,
        productUrl,
      ),
    );
  }, [brand, price, product?.category, product?.id, product?.name, product?.slug, productUrl]);

  const doAdd = () => {
    const colorMissing = hasColorOptions && !selectedColor;
    const sizeMissing = sizes.length > 0 && !selectedSize;

    if (product.variants.length > 0 && !variant) {
      if (colorMissing && sizeMissing) {
        toast.error("Please select color and size to cart");
        return;
      }
      if (colorMissing) {
        toast.error("Please select color to cart");
        return;
      }
      if (sizeMissing) {
        toast.error("Please select size to cart");
        return;
      }
    }

    cart.add({
      productId: product.id,
      variantId: variant?.id,
      slug: product.slug,
      name: product.name,
      image: variant?.image_url ?? product.images[0]?.url ?? "",
      variantLabel: variant ? (variant.size ? `${variant.color}: ${variant.size}` : variant.color) : undefined,
      unitPrice: price,
      quantity: qty,
    });

    trackAddToCart(
      buildAddToCartPayload(
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
        },
        price,
        qty,
        variant ? (variant.size ? `${variant.color}: ${variant.size}` : variant.color) : undefined,
        brand,
        productUrl,
      ),
    );

    setCartAddedImage(variant?.image_url ?? product.images[0]?.url ?? null);
    setCartAddedOpen(true);
  };
  const doBuy = () => {
    const colorMissing = hasColorOptions && !selectedColor;
    const sizeMissing = sizes.length > 0 && !selectedSize;

    if (product.variants.length > 0 && !variant) {
      if (colorMissing && sizeMissing) {
        toast.error("Please select color and size to cart");
        return;
      }
      if (colorMissing) {
        toast.error("Please select color to cart");
        return;
      }
      if (sizeMissing) {
        toast.error("Please select size to cart");
        return;
      }
    }

    requestBeginCheckoutIntent();
    doAdd();
    navigate({ to: "/checkout" });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const category = product.category;

  if (isSettingsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div className="space-y-4">
            <div className="aspect-[4/5] animate-pulse rounded-sm bg-muted/70" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-sm bg-muted/60" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
            <div className="h-12 w-full animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <div className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        {category && (
          <>
            <Link to="/category/$slug" params={{ slug: category.slug }} className="hover:text-foreground">
              {category.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <div className="overflow-hidden rounded-sm bg-muted cursor-zoom-in">
            {activeMedia?.type === "video" ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={activeMedia.src}
                  title={`${product.name} video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : activeMedia?.src ? (
                <picture>
                  <source srcSet={activeMedia.src.replace(/\.(png|jpe?g|avif)$/i, ".webp")} type="image/webp" />
                  <img
                    src={activeMedia.src}
                    alt={product.name}
                    loading={activeMedia === gallery[0] ? "eager" : "lazy"}
                    className="aspect-video w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openImageModal(activeMedia.src)}
                  />
                </picture>
            ) : (
              <div className="aspect-video w-full bg-muted" />
            )}
          </div>
          {gallery.length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {gallery.map((item, i) => (
                <button
                  key={`${item.type}-${item.src}-${i}`}
                  onClick={() => setActiveMedia(item)}
                  className={`overflow-hidden rounded-sm border ${activeMedia?.type === item.type && activeMedia?.src === item.src ? "border-foreground" : "border-border"}`}
                >
                  {item.type === "video" ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      {item.videoId && (
                        <img
                          src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                          alt="Video thumbnail"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="size-6 fill-white text-white" />
                      </div>
                    </div>
                  ) : (
                    <picture>
                      <source srcSet={item.src.replace(/\.(png|jpe?g|avif)$/i, ".webp")} type="image/webp" />
                      <img src={item.src} alt={`${product.name} image ${i + 1}`} loading="lazy" className="aspect-video w-full object-cover" />
                    </picture>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold">
            {category && <span>{category.name}</span>}
            {productBrand && (
              <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[10px] font-medium tracking-[0.25em] text-gold">
                {productBrand}
              </span>
            )}
          </div>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-serif text-3xl">{currency}{price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through">{currency}{compare.toLocaleString()}</span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
                Save {currency}{(compare - price).toLocaleString()}
              </span>
            )}
          </div>

          <div className="mt-2 text-xs uppercase tracking-[0.2em] flex flex-wrap gap-2">
            {stock > 0 ? (
              <span className="text-green-700">In Stock</span>
            ) : (
              <span className="text-destructive">Sold Out</span>
            )}
            {stock > 0 && almostSoldOut && (
              <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">{stock} items left</span>
            )}
            {stock > 0 && !almostSoldOut && lowStock && (
              <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">Low stock</span>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.25em]">Color</div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 text-sm border ${selectedColor === color ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {sizes.length > 0 && (
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.25em]">Size</div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 text-sm border ${selectedSize === size ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2">−</button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2">+</button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={doAdd}
              disabled={stock === 0}
              className="inline-flex items-center justify-center gap-2 border border-foreground bg-background px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              <ShoppingBag className="size-4" /> Add to Cart
            </button>
            <button
              onClick={doBuy}
              disabled={stock === 0}
              className="inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85 disabled:opacity-40"
            >
              <Zap className="size-4" /> Buy Now
            </button>
            <a
              href={whatsappHrefFor(waNumber, waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 border border-[#25D366] bg-[#25D366] px-6 py-3 text-xs uppercase text-white hover:opacity-90"
            >
              <MessageCircle className="size-4" /> Any Issues? Contact WhatsApp
            </a>
          </div>

          <button
            onClick={copyLink}
            className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-4 text-green-700" /> : <Copy className="size-4" />}
            {copied ? "Link copied" : "Copy product link"}
          </button>

        </div>
      </div>

      {(() => {
        const rel = allProducts
          .filter((p) => p.id !== product.id && p.category?.slug === category?.slug)
          .slice(0, 4);
        const hasDesc = Boolean(product.description);
        const hasSizeChart = Boolean(product.size_chart_url);
        if (rel.length === 0 && !hasDesc && !hasSizeChart) return null;
        return (
          <>
            {(hasDesc || hasSizeChart) && (
              <section className="mt-16 md:mt-20 max-w-5xl">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                  {hasDesc && (
                    <div>
                      <div className="mb-4 text-[11px] uppercase tracking-[0.3em] text-gold">Description</div>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{product.description}</p>
                    </div>
                  )}
                  {hasSizeChart && (
                    <div className="rounded border border-border bg-card p-4">
                      <div className="mb-4 text-[11px] uppercase tracking-[0.3em] text-gold">Size Chart</div>
                      {/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(product.size_chart_url!) ? (
                        <img src={product.size_chart_url!} alt={`${product.name} size chart`} className="w-full rounded object-contain" />
                      ) : /\.pdf$/i.test(product.size_chart_url!) ? (
                        <iframe src={product.size_chart_url!} title={`${product.name} size chart`} className="min-h-[420px] w-full rounded border border-border" />
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm leading-relaxed text-muted-foreground">Open the size chart for this product.</p>
                          <a href={product.size_chart_url!} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium underline">Open size chart</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
            {rel.length > 0 && (
            <section className="mt-24">
            <div className="mb-8 text-center">
              <div className="text-[11px] uppercase tracking-[0.35em] text-gold">You may also love</div>
              <h2 className="mt-2 font-serif text-3xl">Related pieces</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
              {rel.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            </section>
            )}
          </>
        );
      })()}

      <Dialog open={cartAddedOpen} onOpenChange={setCartAddedOpen}>
        <DialogContent className="w-full max-w-md border-0 bg-background p-0 sm:rounded-xl">
          <div className="flex flex-col items-center space-y-4 p-8 text-center">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
              {cartAddedImage ? (
                <img src={cartAddedImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>

            <div>
              <h2 className="font-serif text-2xl">Added to cart</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.name} has been added to your bag.
              </p>
            </div>

            <div className="w-full grid gap-3 pt-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCartAddedOpen(false)}
                className="inline-flex items-center justify-center border border-foreground px-4 py-3 text-xs uppercase tracking-[0.25em] hover:bg-foreground hover:text-background"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => {
                  requestBeginCheckoutIntent();
                  setCartAddedOpen(false);
                  navigate({ to: "/checkout" });
                }}
                className="inline-flex items-center justify-center bg-foreground px-4 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85"
              >
                Go to Checkout
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-md w-full p-1 bg-background border-0 flex items-center justify-center">
          <button
            onClick={() => setImageModalOpen(false)}
            className="absolute right-2 top-2 z-50 inline-flex items-center justify-center rounded-full bg-red-600 opacity-100 ring-offset-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1"
          >
            <X className="h-4 w-4 text-yellow-100" />
            <span className="sr-only">Close</span>
          </button>
          {modalImage && (
            <div className="aspect-square w-full overflow-hidden">
              <picture>
                <source srcSet={modalImage!.replace(/\.(png|jpe?g|avif)$/i, ".webp")} type="image/webp" />
                <img src={modalImage!} alt={product.name} loading="eager" className="w-full h-full object-cover" />
              </picture>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
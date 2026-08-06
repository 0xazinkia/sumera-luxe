import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlidesQuery } from "@/lib/queries";

const BENGALI_RE = /[\u0980-\u09FF]/;
const containsBengali = (value?: string) => typeof value === "string" && BENGALI_RE.test(value);

export function HeroSlider() {
  const heroQuery = useQuery(heroSlidesQuery());
  const allSlides = (heroQuery.data ?? []) as any[];
  const isLoading = heroQuery.isPending || heroQuery.isFetching;
  const [i, setI] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileRatio, setMobileRatio] = useState<number | null>(null);
  const slideImageRefs = useRef<Array<HTMLImageElement | null>>([]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileRatio(null);
      return;
    }

    const activeImage = slideImageRefs.current[i];
    if (activeImage?.complete && activeImage.naturalWidth && activeImage.naturalHeight) {
      setMobileRatio(activeImage.naturalWidth / activeImage.naturalHeight);
    }
  }, [i, isMobile, allSlides.length]);

  const slides = isMobile ? allSlides : allSlides.filter((s) => s.image_url);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    if (i >= slides.length) setI(0);
  }, [i, slides.length]);

  const go = (delta: number) => setI((v) => (v + delta + slides.length) % slides.length);

  if (isLoading) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-[1600px] aspect-[3/1] min-h-[380px] md:min-h-[460px]">
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.08)_100%)]" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
              <div className="max-w-xl space-y-4">
                <div className="h-4 w-24 rounded-full bg-muted/70" />
                <div className="h-10 w-3/4 rounded bg-muted/70" />
                <div className="h-4 w-full rounded bg-muted/50" />
                <div className="h-4 w-2/3 rounded bg-muted/50" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-center aspect-[3/1] min-h-[380px] bg-muted/50 md:min-h-[460px]">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gold">New arrivals</p>
            <h2 className="mt-3 font-serif text-3xl text-foreground md:text-4xl">Discover the latest collection</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div
        className="relative mx-auto max-w-[1600px] sm:aspect-[3/1] min-h-[380px] md:min-h-[460px]"
        style={isMobile && mobileRatio ? { aspectRatio: mobileRatio, minHeight: 0 } : undefined}
      >
        {slides.map((s: any, idx: number) => (
          <div
            key={s.id ?? idx}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
          >
            <img
              ref={(node) => {
                slideImageRefs.current[idx] = node;
              }}
              src={isMobile ? (s.mobile_image_url ?? s.image_url) : s.image_url}
              alt={s.title?.trim() || s.eyebrow?.trim() || s.subtitle?.trim() || "Hero slide"}
              className={`h-full w-full ${isMobile && s.mobile_image_url ? "object-contain" : "object-cover"}`}
              loading={idx === 0 ? "eager" : "lazy"}
              onLoad={(e) => {
                if (idx !== i || !isMobile || !s.mobile_image_url) return;
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setMobileRatio(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
            {(s.eyebrow || s.title || s.subtitle || s.cta_label) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
                    <div className="max-w-xl">
                      {s.eyebrow && (
                        <div className={`${containsBengali(s.eyebrow) ? "text-base tracking-normal" : "text-base uppercase tracking-[0.35em]"} pb-4 text-gold ${containsBengali(s.eyebrow) ? "bangla-font" : ""}`}>{s.eyebrow}</div>
                      )}
                      {s.title?.trim() ? (
                        <h1 className={`font-serif font-bold text-4xl leading-[1.05] text-foreground md:text-6xl ${containsBengali(s.title) ? "bangla-font" : ""}`}>
                          {s.title}
                        </h1>
                      ) : null}
                      {s.subtitle && (
                        <p className={`mt-5 max-w-md text-sm text-muted-foreground md:text-base ${containsBengali(s.subtitle) ? "bangla-font" : ""}`}>
                          {s.subtitle}
                        </p>
                      )}
                      {s.cta_label && s.cta_href && (
                        <div className="mt-8 flex items-center gap-4">
                          <Link
                            to={s.cta_href}
                            className={`inline-flex items-center gap-2 bg-foreground px-7 py-4 text-sm text-background transition hover:bg-foreground/85 ${containsBengali(s.cta_label) ? "bangla-font" : "uppercase tracking-[0.25em]"}`}
                          >
                            {s.cta_label}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground shadow hover:bg-background"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground shadow hover:bg-background"
          >
            <ChevronRight className="size-5" />
          </button>

          {!isMobile && (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1 rounded-full transition-all ${idx === i ? "w-8 bg-foreground" : "w-4 bg-foreground/30"}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
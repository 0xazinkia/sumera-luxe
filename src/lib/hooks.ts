import { useQuery } from "@tanstack/react-query";
import {
  categoriesQuery,
  siteSettingsQuery,
  heroSlidesQuery,
  bannersQuery,
} from "@/lib/queries";

export function useCategories() {
  return useQuery(categoriesQuery()).data ?? [];
}

export function useSiteSettings() {
  return useQuery(siteSettingsQuery()).data ?? null;
}

export function useHeroSlides() {
  return useQuery(heroSlidesQuery()).data ?? [];
}

export function useBanners() {
  return useQuery(bannersQuery()).data ?? [];
}

export function useBannerBySlot(slot: string) {
  const list = useBanners();
  return list.find((b) => b.slot === slot) ?? null;
}
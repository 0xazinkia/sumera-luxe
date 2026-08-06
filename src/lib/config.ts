// Static fallback used before site_settings loads from the database.
// Runtime values come from siteSettingsQuery / useSiteSettings.
export const SITE_FALLBACK = {
  name: "Suméra Luxe",
  tagline: "Beauty · Skincare · Gift Items",
  whatsappNumber: "8801322126233",
  whatsappDisplay: "+880 1322-126233",
  facebookUrl: "https://facebook.com/",
  email: "hello@sumeraluxe.com",
  currency: "Tk. ",
  deliveryInsideDhaka: 60,
  deliveryOutsideDhaka: 120,
};

export const whatsappHref = (message: string, number = SITE_FALLBACK.whatsappNumber) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

export const productEnquiryMessage = (name: string, url: string, brand = SITE_FALLBACK.name) =>
  `Hello ${brand},\n\nI want to know about this product.\n\nProduct Name:\n${name}\n\nProduct Link:\n${url}\n\nPlease provide more information.`;

// Back-compat alias so old imports don't break at build time.
export const SITE = SITE_FALLBACK;
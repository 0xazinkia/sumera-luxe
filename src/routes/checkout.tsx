import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { validateDiscountCode, siteSettingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { bangladeshDistricts } from "@/lib/bangladesh-districts";
import { toast } from "sonner";
import { buildCheckoutPayload, buildPurchasePayload, buildShippingInfoPayload } from "@/tracking";
import { consumePendingBeginCheckoutIntent, trackAddShippingInfo, trackPurchase } from "@/tracking";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Suméra Luxe" },
      { name: "description", content: "Complete your Suméra Luxe order with cash on delivery." },
      { property: "og:title", content: "Checkout — Suméra Luxe" },
      { property: "og:description", content: "Cash on delivery checkout." },
      { property: "og:url", content: "https://sumeraluxe.com/checkout" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/checkout" }],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const currency = settings?.currency_symbol ?? "Tk. ";
  const insideFee = Number(settings?.delivery_inside_dhaka ?? 60);
  const outsideFee = Number(settings?.delivery_outside_dhaka ?? 120);

  const navigate = useNavigate();
  const [area, setArea] = useState<"inside" | "outside">("inside");
  const delivery = area === "inside" ? insideFee : outsideFee;

  const getAreaForDistrict = (district: string): "inside" | "outside" => {
    const normalized = district.trim().toLowerCase();
    const insideDhakaDistricts = ["dhaka", "narayanganj", "gazipur"];
    return insideDhakaDistricts.includes(normalized) ? "inside" : "outside";
  };
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const discountAmount = discount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount) + delivery;
  const [form, setForm] = useState({ name: "", phone: "", district: "", address: "" });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shippingSignatureRef = useRef<string | null>(null);
  const beginCheckoutConsumedRef = useRef(false);

  const normalizePhoneDigits = (phone: string) => phone.replace(/\D/g, "");
  const normalizeBangladeshPhone = (phone: string) => {
    const digits = normalizePhoneDigits(phone);
    if (digits.startsWith("0") && digits.length === 11) return `880${digits.slice(1)}`;
    if (digits.startsWith("880") && digits.length === 13) return digits;
    if (digits.length === 11 && digits.startsWith("01")) return `880${digits}`;
    return digits;
  };

  const META_CAPI_COUNTRY = "bd";
  const normalizeCity = (city: string) => city.trim().toLowerCase();

  const splitCustomerName = (fullName: string) => {
    const cleaned = fullName.trim().replace(/\s+/g, " ");
    const parts = cleaned.split(" ").filter(Boolean);

    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
    return { firstName: `${parts[0]} ${parts[1]}`, lastName: parts.slice(2).join(" ") };
  };

  const isPhoneValid = (phone: string) => /^01\d{9}$/.test(normalizePhoneDigits(phone));
  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, phone: value }));
    const digits = normalizePhoneDigits(value);
    if (!value.trim()) {
      setPhoneError(null);
      return;
    }
    if (!/^01\d{9}$/.test(digits)) {
      setPhoneError("Phone number must be 11 digits and start with 01.");
      return;
    }
    setPhoneError(null);
  };

  useEffect(() => {
    if (!form.district) {
      setArea("inside");
      return;
    }

    setArea(getAreaForDistrict(form.district));
  }, [form.district]);

  useEffect(() => {
    if (beginCheckoutConsumedRef.current || items.length === 0) return;

    beginCheckoutConsumedRef.current = true;
    consumePendingBeginCheckoutIntent(
      buildCheckoutPayload(
        items,
        subtotal,
        delivery,
        discountAmount,
        settings?.brand_name ?? null,
        typeof window !== "undefined" ? window.location.href : undefined,
      ),
    );
  }, [items, subtotal, delivery, discountAmount, settings?.brand_name]);

  useEffect(() => {
    if (items.length === 0 || !form.district) return;

    const signature = `${form.district}|${area}|${delivery}`;
    if (shippingSignatureRef.current === signature) return;

    shippingSignatureRef.current = signature;
    trackAddShippingInfo(
      buildShippingInfoPayload(
        form.district,
        area,
        delivery,
        items,
        subtotal,
        discountAmount,
        settings?.brand_name ?? null,
        typeof window !== "undefined" ? window.location.href : undefined,
      ),
    );
  }, [area, delivery, discountAmount, form.district, items, settings?.brand_name, subtotal]);

  if (isSettingsLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-muted/70" />
          <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-sm bg-muted/60" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-sm bg-muted/60" />
        </div>
      </div>
    );
  }

  const applyCode = async () => {
    setCheckingCode(true);
    const res = await validateDiscountCode(codeInput, subtotal);
    setCheckingCode(false);
    if (!res.ok) {
      setDiscount(null);
      setCodeMsg(res.reason);
      return;
    }
    setDiscount({ code: res.code.code, amount: res.amount });
    setCodeMsg(null);
    toast.success(`Code ${res.code.code} applied`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl">Your bag is empty</h1>
        <Link to="/products" search={{ q: undefined }} className="mt-6 inline-block underline">Continue shopping</Link>
      </div>
    );
  }

  const onChange = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = normalizePhoneDigits(form.phone);
    if (!isPhoneValid(form.phone)) {
      setPhoneError("Phone number must be 11 digits and start with 01.");
      return;
    }
    setPhoneError(null);
    setSubmitting(true);

    // subtotal/total/discount_amount/unit_price are recomputed server-side in
    // place_order from trusted product/variant prices — never trust the client
    // figures for the record or for the Purchase tracking payload.
    const { data, error } = await supabase.rpc("place_order", {
      _order: {
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        city: form.district,
        area: area === "inside" ? "inside_dhaka" : "outside_dhaka",
        discount_code: discount?.code ?? null,
      },
      _items: items.map((l) => ({
        product_id: l.productId,
        variant_id: l.variantId ?? null,
        product_name: l.name,
        variant_label: l.variantLabel ?? null,
        quantity: l.quantity,
        image_url: l.image,
      })),
    });

    if (error) {
      console.error(error);
      toast.error(error.message || "Could not place order. Please try again or use WhatsApp.");
      setSubmitting(false);
      return;
    }

    const row = Array.isArray(data) ? (data[0] as any) : (data as any);
    const orderNumber = row?.order_number ?? "";
    const serverTotal = Number(row?.total ?? total);

    if (typeof window !== "undefined") {
      const { firstName, lastName } = splitCustomerName(form.name);
      const normalizedPhone = normalizeBangladeshPhone(form.phone);
      const normalizedCity = normalizeCity(form.district);

      window.sessionStorage.setItem(
        "sumera_tracking_last_purchase",
        JSON.stringify({
          orderNumber,
          total: serverTotal,
          customerName: form.name,
          customerPhone: form.phone,
          customerDistrict: form.district,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerPhoneNormalized: normalizedPhone,
          customerCity: normalizedCity,
          customerCountry: META_CAPI_COUNTRY,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            variantLabel: item.variantLabel,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        }),
      );

      window.sessionStorage.setItem(
        "sumera_tracking_pending_purchase",
        JSON.stringify({
          orderNumber,
          total: serverTotal,
          customerName: form.name,
          customerPhone: form.phone,
          customerDistrict: form.district,
          customerFirstName: firstName,
          customerLastName: lastName,
          customerPhoneNormalized: normalizedPhone,
          customerCity: normalizedCity,
          customerCountry: META_CAPI_COUNTRY,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            variantLabel: item.variantLabel,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        }),
      );
    }

    clear();
    navigate({ to: "/order-success", search: { total: serverTotal, order: orderNumber } as any });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Almost There</div>
        <h1 className="mt-2 font-serif text-4xl">Checkout</h1>
        <div className="gold-rule mt-4" />
      </div>

      <form onSubmit={submit} className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="font-serif text-xl">Customer Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="block">
                <label htmlFor="co-name" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Full Name</label>
                <input id="co-name" name="name" autoComplete="name" required value={form.name} onChange={onChange("name")} className="mt-1 w-full border border-border bg-background px-3 py-2.5" />
              </div>
              <div className="block">
                <label htmlFor="co-phone" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone Number</label>
                <input
                  id="co-phone"
                  name="phone"
                  autoComplete="tel"
                  required
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={onPhoneChange}
                  className="mt-1 w-full border border-border bg-background px-3 py-2.5"
                />
                {phoneError && <p className="mt-2 text-xs text-destructive">{phoneError}</p>}
              </div>
              <div className="block md:col-span-2">
                <label htmlFor="co-district" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">District</label>
                <div className="mt-1">
                  <select
                    id="co-district"
                    name="district"
                    required
                    value={form.district}
                    onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm shadow-sm transition focus:border-foreground focus:outline-none focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="" disabled>Select district</option>
                    {bangladeshDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="block md:col-span-2">
                <label htmlFor="co-address" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Full Address</label>
                <textarea id="co-address" name="address" autoComplete="street-address" required value={form.address} onChange={onChange("address")} rows={3} className="mt-1 w-full border border-border bg-background px-3 py-2.5" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl">Delivery Area</h2>
            <div className="mt-4 rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{area === "inside" ? "Inside Dhaka" : "Outside Dhaka"}</div>
                  <div className="text-xs text-muted-foreground">Selected automatically from your district.</div>
                </div>
                <div className="text-sm font-medium">{currency}{delivery.toLocaleString()}</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl">Payment</h2>
            <div className="mt-4 border border-foreground bg-muted p-4 text-sm">
              <div className="font-medium">Cash on Delivery</div>
              <div className="text-xs text-muted-foreground">Pay in cash when your order is delivered.</div>
            </div>
          </section>
        </div>

        <aside className="h-fit border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Your Order</h2>
          <div className="mt-4 space-y-3 text-sm">
            {items.map((l) => (
              <div key={`${l.productId}_${l.variantId ?? ""}`} className="flex items-start gap-3">
                <img src={l.image} alt="" className="h-14 w-14 rounded-sm object-cover" />
                <div className="flex-1">
                  <div className="text-sm">{l.name}</div>
                  {l.variantLabel && <div className="text-xs text-muted-foreground">{l.variantLabel}</div>}
                  <div className="text-xs text-muted-foreground">Qty {l.quantity}</div>
                </div>
                <div className="text-sm">{currency}{(l.unitPrice * l.quantity).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{currency}{subtotal.toLocaleString()}</span></div>
            {discount && (
              <div className="flex justify-between text-gold">
                <span>Discount ({discount.code})</span>
                <span>−{currency}{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{currency}{delivery.toLocaleString()}</span></div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Discount Code</div>
            <div className="mt-2 flex gap-2">
              <label htmlFor="co-discount" className="sr-only">Discount code</label>
              <input
                id="co-discount"
                name="discount"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter code"
                className="w-full border border-border bg-background px-3 py-2 text-sm uppercase"
              />
              <button
                type="button"
                onClick={applyCode}
                disabled={checkingCode}
                className="shrink-0 border border-foreground px-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              >
                {checkingCode ? "…" : "Apply"}
              </button>
            </div>
            {codeMsg && <p className="mt-2 text-xs text-destructive">{codeMsg}</p>}
            {discount && (
              <button
                type="button"
                onClick={() => { setDiscount(null); setCodeInput(""); }}
                className="mt-2 text-xs text-muted-foreground underline"
              >
                Remove code
              </button>
            )}
          </div>

          <div className="mt-3 flex justify-between border-t border-border pt-3 font-serif text-lg">
            <span>Total</span><span>{currency}{total.toLocaleString()}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85 disabled:opacity-50"
          >
            {submitting ? "Placing…" : "Place Order · COD"}
          </button>

        </aside>
      </form>
    </div>
  );
}
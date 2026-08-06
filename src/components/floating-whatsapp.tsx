import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/config";
import { useSiteSettings } from "@/lib/hooks";

export function FloatingWhatsApp({ message }: { message?: string }) {
  const settings = useSiteSettings();
  const brand = settings?.brand_name ?? "Suméra Luxe";
  const number = settings?.whatsapp_number ?? "8801322126233";
  const href = whatsappHref(message ?? `Hello ${brand}, I'd like to know more.`, number);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105"
    >
      <MessageCircle className="size-6" fill="currentColor" strokeWidth={0} />
    </a>
  );
}
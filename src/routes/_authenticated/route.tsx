import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const hasAdminCookie = (): boolean => {
  return document.cookie.includes("admin_authorized=true");
};

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Check admin secret key cookie
    if (!hasAdminCookie()) {
      throw redirect({ to: "/" });
    }
    
    // Check Supabase authentication
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
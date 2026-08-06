import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-access")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: (search.key as string) || "",
  }),
  component: AdminAccessValidator,
});

function AdminAccessValidator() {
  const navigate = useNavigate();
  const { key } = useSearch({ from: "/admin-access" });

  useEffect(() => {
    const validateAndSetCookie = async () => {
      const adminSecretKey = import.meta.env.VITE_ADMIN_SECRET_KEY;

      if (!key) {
        toast.error("Access key required");
        setTimeout(() => navigate({ to: "/" }), 2000);
        return;
      }

      // Trim and compare keys (remove quotes if any)
      const trimmedKey = String(key).trim();
      const trimmedSecret = String(adminSecretKey).trim().replace(/^"|"$/g, "");

      if (trimmedKey !== trimmedSecret) {
        toast.error(`Invalid access key`);
        setTimeout(() => navigate({ to: "/" }), 2000);
        return;
      }

      // Set secure cookie (no secure flag for localhost)
      const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168');
      const cookieSecure = isProduction ? '; secure' : '';
      document.cookie = `admin_authorized=true; path=/; samesite=strict${cookieSecure}; max-age=2592000`;
      
      toast.success("Access granted. Redirecting…");
      
      // Delay navigation to show toast
      setTimeout(() => {
        navigate({ to: "/auth" });
      }, 1500);
    };

    validateAndSetCookie();
  }, [key, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Validating access…</h1>
        <p className="mt-2 text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}

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
      if (!key) {
        toast.error("Access key required");
        setTimeout(() => navigate({ to: "/" }), 2000);
        return;
      }

      const trimmedKey = String(key).trim();

      try {
        const response = await fetch("/api/admin-access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: trimmedKey }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          toast.error(data?.error ?? "Invalid access key");
          setTimeout(() => navigate({ to: "/" }), 2000);
          return;
        }

        toast.success("Access granted. Redirecting…");
        setTimeout(() => {
          navigate({ to: "/auth" });
        }, 1500);
      } catch (error) {
        console.error(error);
        toast.error("Access verification failed. Please try again.");
        setTimeout(() => navigate({ to: "/" }), 2000);
      }
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
